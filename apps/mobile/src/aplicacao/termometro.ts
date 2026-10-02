/**
 * O núcleo do app: guarda primeiro no aparelho, mostra na hora e envia a
 * fila em ordem quando há rede (PROJECT.md, 8.4). Lê a planilha ao abrir, ao
 * voltar ao primeiro plano e quando a rede volta; a planilha sempre vence.
 *
 * Envio e leitura passam por `exclusivo`, um de cada vez: uma leitura nunca
 * cruza com um envio, então a resposta de um `listar` antigo não apaga uma
 * linha que acabou de ser gravada.
 */
import {
  aplicarEdicao,
  type Edicao,
  type LancamentoSalvo,
  type LinhaNova,
  linhaNovaSchema,
  PAYLOADS,
} from '@termometro/contract';
import {
  alcanceDaExclusao,
  type DataISO,
  diasNoMes,
  type Estorna,
  mesDe,
  somarDias,
  versao,
} from '@termometro/dominio';
import { atrasoDaTentativa, destinoDaFalha } from './destino.ts';
import type { Ajuste, Estado } from './estado.ts';
import { estadoInicial } from './estado.ts';
import { aplicarMudanca, type Mudanca, NADA_GUARDADO } from './guardado.ts';
import {
  alvos,
  emOrdem,
  type Operacao,
  type OperacaoEditar,
  type OperacaoExcluir,
  type OperacaoLancar,
  proximoSeq,
} from './operacao.ts';
import { diferenca, medir } from './painel.ts';
import type { FalhaDaApi, Portas } from './portas.ts';
import { projetar } from './projecao.ts';
import { linhasDoRascunho, type Rascunho } from './rascunho.ts';

export type Resultado = { readonly ok: true } | { readonly ok: false; readonly problema: string };
export type ResultadoDoLancar =
  | { readonly ok: true; readonly ids: readonly string[] }
  | { readonly ok: false; readonly problema: string };

/** O que a planilha devolveu para uma operação concluída. */
type Efeito = { readonly gravar: readonly LancamentoSalvo[]; readonly remover: readonly string[] };

/** Leitura ao abrir: o mês de hoje e ±3 dias, para os previstos perto da virada (PROJECT.md, 8.4). */
const FOLGA_EM_DIAS = 3;

export class Termometro {
  private atual: Estado;
  private token: string | null = null;
  private readonly ouvintes = new Set<(estado: Estado) => void>();
  private cadeia: Promise<void> = Promise.resolve();
  private cancelarNovaTentativa: (() => void) | null = null;

  constructor(private readonly portas: Portas) {
    this.atual = estadoInicial(portas.relogio.hoje());
  }

  get estado(): Estado {
    return this.atual;
  }

  /** Chama o ouvinte agora e a cada mudança. Devolve a função que cancela. */
  assinar(ouvinte: (estado: Estado) => void): () => void {
    this.ouvintes.add(ouvinte);
    ouvinte(this.atual);
    return () => this.ouvintes.delete(ouvinte);
  }

  async iniciar(): Promise<void> {
    const [guardado, token] = await Promise.all([
      this.portas.armazem.carregar().catch((erro: unknown) => {
        this.avisar(`Não foi possível ler os dados do aparelho: ${mensagem(erro)}`);
        return NADA_GUARDADO;
      }),
      this.portas.cofre.lerToken(),
    ]);
    this.token = token;
    this.mudar({ ...guardado, fase: token ? 'pronto' : 'sem-token' });
    if (token) void this.atualizar();
  }

  /** Primeiro acesso (tela 0): o `ping` confere o token e traz o nome do dono. */
  async conectar(token: string): Promise<Resultado> {
    const resposta = await this.portas.api.chamar('ping', null, token);
    if (!resposta.ok) return { ok: false, problema: problemaAoConectar(resposta.falha) };
    await this.portas.cofre.guardarToken(token);
    this.token = token;
    this.mudar({ fase: 'pronto', bloqueio: null });
    await this.persistir({ dono: resposta.dados.nome });
    void this.atualizar();
    return { ok: true };
  }

  definirOnline(online: boolean): void {
    if (online === this.atual.online) return;
    this.mudar({ online });
    if (online) void this.atualizar();
  }

  /** Ao voltar ao primeiro plano e no puxar para atualizar. */
  atualizar(): Promise<void> {
    return this.exclusivo(async () => {
      this.mudar({ hoje: this.portas.relogio.hoje() });
      await this.enviarFila();
      await this.lerPlanilha();
    });
  }

  /** Resolve quando não há envio nem leitura em andamento. */
  ocioso(): Promise<void> {
    return this.cadeia;
  }

  async lancar(rascunho: Rascunho): Promise<ResultadoDoLancar> {
    const resultado = linhasDoRascunho(rascunho, this.atual.referencias, this.portas.novoId);
    if (!resultado.ok) return resultado;
    await this.enfileirar({ acao: 'lancar', linhas: resultado.linhas });
    return { ok: true, ids: resultado.linhas.map((l) => l.id) };
  }

  /** Confirmar um previsto, ajustando valor e data se mudaram (ADR 0003). */
  confirmar(id: string, ajuste: Pick<Edicao, 'valorCentavos' | 'data'> = {}): Promise<Resultado> {
    return this.editar(id, { ...ajuste, status: 'confirmado' });
  }

  async editar(id: string, edicao: Edicao): Promise<Resultado> {
    const forma = PAYLOADS.editar.safeParse({ id, versaoVista: '-', ...edicao });
    if (!forma.success)
      return { ok: false, problema: forma.error.issues[0]?.message ?? 'inválido' };

    const pendente = this.lancamentoAindaNaFila(id);
    if (pendente) return this.editarNaFila(pendente, id, edicao);

    const noEspelho = this.atual.espelho.find((l) => l.id === id);
    if (!noEspelho && !this.temPendente(id))
      return { ok: false, problema: 'lançamento não encontrado' };
    const encadeada = this.temPendente(id) || !noEspelho;
    await this.enfileirar({
      acao: 'editar',
      id,
      edicao,
      versaoVista: encadeada ? null : noEspelho.versao,
      versaoEsperada: encadeada ? null : versao(aplicarEdicao(noEspelho, edicao)),
    });
    return { ok: true };
  }

  /**
   * "Desfazer" do toast depois de lançar (tela 3; PROJECT.md, 8.4, passo 7):
   * na fila, sai da fila; já enviado, exclui, com as próximas parcelas.
   */
  async desfazer(id: string): Promise<void> {
    const pendente = this.lancamentoAindaNaFila(id);
    if (pendente) {
      await this.removerDaFila([pendente, ...this.dependentes(pendente)]);
      return;
    }
    const linha = projetar(this.atual.espelho, this.atual.fila, this.atual.emEnvio).find(
      (l) => l.id === id,
    );
    if (!linha) return;
    const alvo = linha.grupoId
      ? (this.daProjecao((l) => l.grupoId === linha.grupoId && l.parcelaN === 1) ?? linha)
      : linha;
    const noEspelho = this.atual.espelho.find((l) => l.id === alvo.id);
    await this.enfileirar({
      acao: 'excluir',
      id: alvo.id,
      escopo: alvo.grupoId ? 'esta_e_proximas' : 'so_esta',
      versaoVista: this.temPendente(alvo.id) || !noEspelho ? null : noEspelho.versao,
    });
  }

  /** Tira da fila uma operação travada, e o que dependia dela. */
  async descartar(opId: string): Promise<void> {
    const operacao = this.atual.fila.find((o) => o.opId === opId);
    if (operacao && operacao.opId !== this.atual.emEnvio) {
      await this.removerDaFila([operacao, ...this.dependentes(operacao)]);
    }
  }

  dispensarAviso(id: string): void {
    this.mudar({ avisos: this.atual.avisos.filter((a) => a.id !== id) });
  }

  // --- fila ---------------------------------------------------------------

  private async enfileirar(
    dados:
      | Pick<OperacaoLancar, 'acao' | 'linhas'>
      | Pick<OperacaoEditar, 'acao' | 'id' | 'edicao' | 'versaoVista' | 'versaoEsperada'>
      | Pick<OperacaoExcluir, 'acao' | 'id' | 'escopo' | 'versaoVista'>,
  ): Promise<void> {
    const operacao = {
      ...dados,
      opId: this.portas.novoId(),
      seq: proximoSeq(this.atual.fila),
      tentativas: 0,
      ultimoErro: null,
      travada: false,
    } as Operacao;
    await this.persistir({ fila: { gravar: [operacao] } });
    void this.sincronizar();
  }

  private sincronizar(): Promise<void> {
    return this.exclusivo(() => this.enviarFila());
  }

  private async enviarFila(): Promise<void> {
    if (!this.token || this.atual.bloqueio || !this.atual.online) return;
    this.cancelarNovaTentativa?.();
    this.cancelarNovaTentativa = null;
    this.mudar({ sincronizando: true });
    try {
      for (
        let op = proximaParaEnviar(this.atual.fila);
        op;
        op = proximaParaEnviar(this.atual.fila)
      ) {
        this.mudar({ emEnvio: op.opId });
        const continuar = await this.enviar(op, this.token);
        this.mudar({ emEnvio: null });
        if (!continuar) break;
      }
    } finally {
      this.mudar({ sincronizando: false, emEnvio: null });
    }
  }

  /** Envia uma operação e trata a resposta. Devolve se a fila segue. */
  private async enviar(op: Operacao, token: string): Promise<boolean> {
    const resposta = await this.chamarOperacao(op, token);
    if (resposta === 'sem-versao') {
      await this.travar(op, 'sem a versão da operação anterior');
      return true;
    }
    if (resposta.ok) {
      await this.concluir(op, resposta.efeito);
      return true;
    }
    return this.tratarFalha(op, resposta.falha, token);
  }

  private async chamarOperacao(
    op: Operacao,
    token: string,
  ): Promise<{ ok: true; efeito: Efeito } | { ok: false; falha: FalhaDaApi } | 'sem-versao'> {
    const { api } = this.portas;
    if (op.acao === 'lancar') {
      const r = await api.chamar('lancar', { linhas: [...op.linhas] }, token);
      return r.ok ? { ok: true, efeito: { gravar: r.dados.linhas, remover: [] } } : r;
    }
    if (op.versaoVista === null) return 'sem-versao';
    if (op.acao === 'editar') {
      const payload = { id: op.id, versaoVista: op.versaoVista, ...op.edicao };
      const r = await api.chamar('editar', payload, token);
      return r.ok ? { ok: true, efeito: { gravar: [r.dados.linha], remover: [] } } : r;
    }
    const payload = { id: op.id, versaoVista: op.versaoVista, escopo: op.escopo };
    const r = await api.chamar('excluir', payload, token);
    return r.ok ? { ok: true, efeito: { gravar: [], remover: r.dados.excluidos } } : r;
  }

  private async tratarFalha(op: Operacao, falha: FalhaDaApi, token: string): Promise<boolean> {
    switch (destinoDaFalha(op.acao, falha)) {
      case 'tentar-depois':
        await this.tentarDepois(op, falha.mensagem);
        return false;
      case 'bloquear-token':
        this.bloquear(
          'token',
          'O token foi recusado. Conecte de novo para enviar o que ficou guardado.',
        );
        return false;
      case 'bloquear-versao':
        this.bloquear('versao', 'A planilha não aceita esta versão do app. Atualize o app.');
        return false;
      case 'travar':
        await this.travar(op, falha.mensagem);
        return true;
      case 'ja-aplicada':
        await this.concluir(op, { gravar: [], remover: this.alcanceNoEspelho(op) });
        return true;
      case 'conflito':
        await this.desistir(op, 'mudou na planilha; a exclusão não foi feita', {});
        return true;
      case 'sumiu':
        await this.desistir(op, 'não existe mais na planilha', { remover: alvos(op) });
        return true;
      case 'verificar':
        return this.verificarEdicao(op as OperacaoEditar, token);
    }
  }

  /**
   * `CONFLICT` num `editar` pode ser o reenvio de uma edição que já tinha sido
   * aplicada (a resposta se perdeu). Relê a linha: se a versão é a esperada,
   * concluiu; senão, alguém mudou a linha e a edição não é aplicada.
   */
  private async verificarEdicao(op: OperacaoEditar, token: string): Promise<boolean> {
    const base = this.atual.espelho.find((l) => l.id === op.id);
    const datas = [base?.data, op.edicao.data].filter((d): d is DataISO => d !== undefined).sort();
    const de = datas[0];
    const ate = datas[datas.length - 1];
    if (!de || !ate) {
      await this.desistir(op, 'mudou na planilha; a edição não foi feita', {});
      return true;
    }
    const r = await this.portas.api.chamar('listar', { de, ate }, token);
    if (!r.ok) return this.tratarFalha({ ...op, acao: 'lancar', linhas: [] }, r.falha, token);
    const linha = r.dados.linhas.find((l) => l.id === op.id);
    if (linha && linha.versao === op.versaoEsperada) {
      await this.concluir(op, { gravar: [linha], remover: [] });
    } else if (linha) {
      await this.desistir(op, 'mudou na planilha; a edição não foi feita', { gravar: [linha] });
    } else {
      await this.desistir(op, 'não existe mais na planilha', { remover: [op.id] });
    }
    return true;
  }

  /**
   * Tira a operação da fila, grava o que a planilha devolveu e passa a versão
   * nova para a próxima operação sobre a mesma linha. O efeito no saldo e no
   * consumo fica guardado até o próximo `resumo`, que ainda não o inclui.
   */
  private async concluir(op: Operacao, efeito: Efeito): Promise<void> {
    const { hoje, espelho } = this.atual;
    const espelhoDepois = aplicarMudanca(this.atual, { espelho: efeito }).espelho;
    const delta = diferenca(medir(espelhoDepois, hoje), medir(espelho, hoje));
    if (delta.caixa !== 0 || delta.consumo !== 0) {
      const ajuste: Ajuste = {
        caixaCentavos: delta.caixa,
        consumoCentavos: delta.consumo,
        concluidoEm: this.portas.relogio.agora(),
      };
      this.mudar({ ajustesDesdeResumo: [...this.atual.ajustesDesdeResumo, ajuste] });
    }
    await this.persistir({
      espelho: efeito,
      fila: { remover: [op.opId], gravar: this.encadear(op, efeito.gravar) },
    });
  }

  /** A próxima operação sobre cada linha gravada recebe a versão que a planilha devolveu. */
  private encadear(op: Operacao, gravadas: readonly LancamentoSalvo[]): Operacao[] {
    const resolvidas: Operacao[] = [];
    for (const linha of gravadas) {
      const proxima = emOrdem(this.atual.fila).find(
        (o) => o.seq > op.seq && o.acao !== 'lancar' && o.id === linha.id,
      );
      if (!proxima || proxima.acao === 'lancar' || proxima.versaoVista !== null) continue;
      resolvidas.push(
        proxima.acao === 'editar'
          ? {
              ...proxima,
              versaoVista: linha.versao,
              versaoEsperada: versao(aplicarEdicao(linha, proxima.edicao)),
            }
          : { ...proxima, versaoVista: linha.versao },
      );
    }
    return resolvidas;
  }

  private async tentarDepois(op: Operacao, erro: string): Promise<void> {
    const tentativas = op.tentativas + 1;
    await this.persistir({ fila: { gravar: [{ ...op, tentativas, ultimoErro: erro }] } });
    this.cancelarNovaTentativa = this.portas.agendador.agendar(
      atrasoDaTentativa(tentativas),
      () => {
        void this.sincronizar();
      },
    );
  }

  private async travar(op: Operacao, erro: string): Promise<void> {
    await this.persistir({ fila: { gravar: [{ ...op, travada: true, ultimoErro: erro }] } });
    this.avisar(`Um lançamento foi recusado pela planilha: ${erro}`);
  }

  /** A operação não será aplicada: sai da fila, com o que dependia dela, e o usuário é avisado. */
  private async desistir(
    op: Operacao,
    motivo: string,
    espelho: { gravar?: readonly LancamentoSalvo[]; remover?: readonly string[] },
  ): Promise<void> {
    const removidas = [op, ...this.dependentes(op)].map((o) => o.opId);
    await this.persistir({ espelho, fila: { remover: removidas } });
    this.avisar(`Um lançamento ${motivo}.`);
  }

  private bloquear(motivo: 'token' | 'versao', texto: string): void {
    this.mudar({ bloqueio: motivo });
    this.avisar(texto);
  }

  // --- leitura ------------------------------------------------------------

  private async lerPlanilha(): Promise<void> {
    const token = this.token;
    if (!token || this.atual.bloqueio || !this.atual.online) return;
    const { api, relogio } = this.portas;
    const hoje = relogio.hoje();
    const pedidoEm = relogio.agora();
    const janela = janelaDeLeitura(hoje);
    const [listar, resumo, referencias] = await Promise.all([
      api.chamar('listar', janela, token),
      api.chamar('resumo', { data: hoje }, token),
      api.chamar('referencias', null, token),
    ]);
    if (resumo.ok) {
      this.mudar({
        ajustesDesdeResumo: this.atual.ajustesDesdeResumo.filter((a) => a.concluidoEm > pedidoEm),
      });
    }
    await this.persistir({
      ...(listar.ok ? { espelho: { substituir: janela, gravar: listar.dados.linhas } } : {}),
      ...(resumo.ok ? { resumo: { resumo: resumo.dados, pedidoEm } } : {}),
      ...(referencias.ok ? { referencias: referencias.dados } : {}),
      ...(listar.ok && resumo.ok && referencias.ok ? { ultimaSincronizacao: relogio.agora() } : {}),
    });
    for (const r of [listar, resumo, referencias]) {
      if (!r.ok && r.falha.tipo === 'api' && r.falha.codigo === 'UNAUTHORIZED') {
        this.bloquear('token', 'O token foi recusado. Conecte de novo.');
        return;
      }
    }
  }

  // --- apoio --------------------------------------------------------------

  /** Lançamento cuja operação `lancar` ainda não saiu (nem está saindo) e não travou. */
  private lancamentoAindaNaFila(id: string): OperacaoLancar | undefined {
    return this.atual.fila.find(
      (o): o is OperacaoLancar =>
        o.acao === 'lancar' &&
        !o.travada &&
        o.opId !== this.atual.emEnvio &&
        o.linhas.some((l) => l.id === id),
    );
  }

  private async editarNaFila(op: OperacaoLancar, id: string, edicao: Edicao): Promise<Resultado> {
    const linhas = op.linhas.map((l) => (l.id === id ? editarLinhaNova(l, edicao) : l));
    for (const linha of linhas) {
      const validacao = linhaNovaSchema.safeParse(linha);
      if (!validacao.success) {
        return { ok: false, problema: validacao.error.issues.map((i) => i.message).join('; ') };
      }
    }
    await this.persistir({ fila: { gravar: [{ ...op, linhas }] } });
    return { ok: true };
  }

  private temPendente(id: string): boolean {
    return this.atual.fila.some((o) => alvos(o).includes(id));
  }

  /** Operações seguintes que tocam as mesmas linhas e só fazem sentido depois desta. */
  private dependentes(op: Operacao): Operacao[] {
    const ids = new Set(alvos(op));
    return this.atual.fila.filter((o) => o.seq > op.seq && alvos(o).some((id) => ids.has(id)));
  }

  private async removerDaFila(operacoes: readonly Operacao[]): Promise<void> {
    await this.persistir({ fila: { remover: operacoes.map((o) => o.opId) } });
  }

  private alcanceNoEspelho(op: Operacao): string[] {
    if (op.acao !== 'excluir') return alvos(op);
    const alvo = this.atual.espelho.find((l) => l.id === op.id);
    if (!alvo) return [op.id];
    return alcanceDaExclusao(alvo, this.atual.espelho, op.escopo).map((l) => l.id);
  }

  private daProjecao(criterio: (l: ReturnType<typeof projetar>[number]) => boolean) {
    return projetar(this.atual.espelho, this.atual.fila, this.atual.emEnvio).find(criterio);
  }

  /** Muda a memória na hora e grava no aparelho; se a gravação falhar, avisa e segue. */
  private async persistir(mudanca: Mudanca): Promise<void> {
    this.mudar(aplicarMudanca(this.atual, mudanca));
    try {
      await this.portas.armazem.aplicar(mudanca);
    } catch (erro) {
      this.avisar(`Não foi possível guardar no aparelho: ${mensagem(erro)}`);
    }
  }

  private avisar(texto: string): void {
    this.mudar({ avisos: [...this.atual.avisos, { id: this.portas.novoId(), texto }] });
  }

  private exclusivo(tarefa: () => Promise<void>): Promise<void> {
    const proxima = this.cadeia.then(tarefa).catch((erro: unknown) => {
      this.avisar(`Erro ao sincronizar: ${mensagem(erro)}`);
    });
    this.cadeia = proxima;
    return proxima;
  }

  private mudar(parcial: Partial<Estado>): void {
    this.atual = { ...this.atual, ...parcial };
    for (const ouvinte of this.ouvintes) ouvinte(this.atual);
  }
}

/** Primeira operação que pode sair: pula as travadas e o que toca as mesmas linhas delas. */
function proximaParaEnviar(fila: readonly Operacao[]): Operacao | null {
  const presas = new Set<string>();
  for (const op of emOrdem(fila)) {
    const ids = alvos(op);
    if (op.travada || ids.some((id) => presas.has(id))) {
      for (const id of ids) presas.add(id);
      continue;
    }
    return op;
  }
  return null;
}

function janelaDeLeitura(hoje: DataISO): { de: DataISO; ate: DataISO } {
  const mes = mesDe(hoje);
  const inicio = `${mes}-01` as DataISO;
  const fim = `${mes}-${diasNoMes(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)))}` as DataISO;
  const antes = somarDias(hoje, -FOLGA_EM_DIAS);
  const depois = somarDias(hoje, FOLGA_EM_DIAS);
  return { de: antes < inicio ? antes : inicio, ate: depois > fim ? depois : fim };
}

/** Uma linha ainda não enviada com a edição aplicada; `estorna: ''` tira o campo. */
function editarLinhaNova(linha: LinhaNova, edicao: Edicao): LinhaNova {
  const definidos = Object.fromEntries(
    Object.entries(edicao).filter(([, valor]) => valor !== undefined),
  ) as Partial<Omit<LinhaNova, 'estorna'>> & { estorna?: Estorna | '' };
  const { estorna, ...resto } = { ...linha, ...definidos };
  return estorna ? { ...resto, estorna } : resto;
}

function problemaAoConectar(falha: FalhaDaApi): string {
  if (falha.tipo === 'rede') return 'Sem internet para conferir o token. Tente de novo com rede.';
  if (falha.codigo === 'UNAUTHORIZED') return 'Token não reconhecido pela planilha.';
  return `A planilha respondeu com erro: ${falha.mensagem}`;
}

function mensagem(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}
