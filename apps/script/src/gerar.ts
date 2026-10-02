/**
 * Menu "Gerar recorrências e faturas": transforma o que foi lido das abas num
 * plano de escrita. Sem I/O; `main.ts` aplica o plano dentro do lock.
 */
import {
  type CamposDeNegocio,
  type CicloDoCartao,
  type DataISO,
  deReais,
  type Fatura,
  faturasEntre,
  type LinhaExistente,
  type LinhaRecorrente,
  mesDaFatura,
  mesDe,
  paraReais,
  planejarRecorrencia,
  problemaNosCampos,
  type Recorrencia,
  STATUS,
} from '@termometro/dominio';
import { lerCampos } from './campos';
import { escreverData, lerBooleano, lerData, lerTexto, type Registro, type Tabela } from './tabela';

type Regra = Recorrencia & CamposDeNegocio;

export type PlanoDeGeracao = {
  /** Linhas novas de Lançamentos, por nome de cabeçalho. */
  readonly lancamentosNovos: Record<string, unknown>[];
  /** Atualizações de Lançamentos: linha (1-based) → campos. */
  readonly lancamentosAlterados: { linha: number; campos: Record<string, unknown> }[];
  /** Ids que a aba Recorrentes não tinha (linhas digitadas à mão). */
  readonly regrasSemId: { linha: number; id: string }[];
  readonly faturasNovas: Record<string, unknown>[];
  readonly avisos: string[];
};

export type Leitura = {
  readonly lancamentos: Tabela;
  readonly recorrentes: Tabela;
  readonly cartoes: Tabela;
  readonly faturas: Tabela;
};

export function planejarGeracao(
  leitura: Leitura,
  hoje: DataISO,
  ate: DataISO,
  agora: Date,
  novoId: () => string,
): PlanoDeGeracao {
  const plano: PlanoDeGeracao = {
    lancamentosNovos: [],
    lancamentosAlterados: [],
    regrasSemId: [],
    faturasNovas: [],
    avisos: [],
  };
  identificarLinhasManuais(leitura.lancamentos, agora, novoId, plano);
  gerarRecorrencias(leitura, hoje, ate, agora, novoId, plano);
  gerarFaturas(leitura, hoje, ate, plano);
  return plano;
}

function gerarRecorrencias(
  leitura: Leitura,
  hoje: DataISO,
  ate: DataISO,
  agora: Date,
  novoId: () => string,
  plano: PlanoDeGeracao,
): void {
  const existentes = linhasPorRegra(leitura.lancamentos);
  for (const registro of leitura.recorrentes.registros) {
    let id = lerTexto(registro.dados.id);
    if (!id) {
      id = novoId();
      plano.regrasSemId.push({ linha: registro.linha, id });
    }
    const regra = lerRegra(id, registro);
    if (typeof regra === 'string') {
      plano.avisos.push(`Recorrentes, linha ${registro.linha}: ${regra}`);
      continue;
    }
    const resultado = planejarRecorrencia(regra, existentes.get(id) ?? [], hoje, ate, novoId);
    const linhaDe = new Map((existentes.get(id) ?? []).map((l) => [l.id, l.linha]));
    for (const nova of resultado.criar) plano.lancamentosNovos.push(novaLinha(nova, agora));
    for (const alterada of resultado.atualizar) {
      plano.lancamentosAlterados.push({
        linha: linhaDe.get(alterada.id) ?? 0,
        campos: { ...camposDaLinha(alterada), atualizado_em: agora },
      });
    }
    for (const excluida of resultado.excluir) {
      plano.lancamentosAlterados.push({
        linha: linhaDe.get(excluida) ?? 0,
        campos: { excluido: true, atualizado_em: agora },
      });
    }
  }
}

/**
 * Linha digitada à mão chega sem `id`/`origem`; o script atribui na primeira
 * leitura, dentro do lock (PROJECT.md, 5.1).
 */
function identificarLinhasManuais(
  lancamentos: Tabela,
  agora: Date,
  novoId: () => string,
  plano: PlanoDeGeracao,
): void {
  for (const { linha, dados } of lancamentos.registros) {
    if (lerTexto(dados.id) || !lerData(dados.data)) continue;
    plano.lancamentosAlterados.push({
      linha,
      campos: {
        id: novoId(),
        origem: lerTexto(dados.origem) || 'planilha',
        criado_em: dados.criado_em || agora,
        atualizado_em: agora,
      },
    });
  }
}

/** Uma regra válida, ou o motivo de ser ignorada. */
function lerRegra(id: string, { dados }: Registro): Regra | string {
  const inicio = lerData(dados.inicio);
  const fim = lerData(dados.fim);
  const dia = Number(dados.dia);
  const valor = Number(dados.valor);
  const campos = lerCampos(dados);
  if (!inicio) return 'início vazio ou inválido';
  if (lerTexto(dados.fim) && !fim) return 'fim inválido';
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) return `dia inválido (${lerTexto(dados.dia)})`;
  if (!Number.isFinite(valor) || valor <= 0) return `valor inválido (${lerTexto(dados.valor)})`;
  const problema = problemaNosCampos(campos);
  if (problema) return problema;
  return {
    ...campos,
    id,
    dia,
    inicio,
    fim: fim ?? undefined,
    // Vazio conta como ativa: só um FALSE explícito desliga a regra.
    ativo: lerTexto(dados.ativo) === '' || lerBooleano(dados.ativo),
    valorCentavos: deReais(valor),
  };
}

type Existente = LinhaExistente & { readonly linha: number };

/** Linhas não excluídas de Lançamentos com `recorrencia_id`, nos nomes do domínio. */
function linhasPorRegra(lancamentos: Tabela): Map<string, Existente[]> {
  const porRegra = new Map<string, Existente[]>();
  for (const { linha, dados } of lancamentos.registros) {
    const recorrenciaId = lerTexto(dados.recorrencia_id);
    const data = lerData(dados.data);
    const status = lerTexto(dados.status);
    // Linha sem id ainda não foi organizada; recebe id nesta rodada e entra na próxima.
    if (
      !recorrenciaId ||
      !lerTexto(dados.id) ||
      !data ||
      lerBooleano(dados.excluido) ||
      !(STATUS as readonly string[]).includes(status)
    ) {
      continue;
    }
    const existente: Existente = {
      ...lerCampos(dados),
      linha,
      id: lerTexto(dados.id),
      recorrenciaId,
      data,
      status: status as Existente['status'],
      valorCentavos: deReais(Number(dados.valor) || 0),
    };
    porRegra.set(recorrenciaId, [...(porRegra.get(recorrenciaId) ?? []), existente]);
  }
  return porRegra;
}

/** Linha do domínio → colunas de negócio da aba Lançamentos. */
function camposDaLinha(linha: LinhaRecorrente<Regra>): Record<string, unknown> {
  return {
    data: escreverData(linha.data),
    valor: paraReais(linha.valorCentavos),
    tipo: linha.tipo,
    estorna: linha.estorna,
    categoria: linha.categoria,
    descricao: linha.descricao,
    quem: linha.quem,
    meio: linha.meio,
    cartao: linha.cartao,
    status: linha.status,
    recorrencia_id: linha.recorrenciaId,
  };
}

function novaLinha(linha: LinhaRecorrente<Regra>, agora: Date): Record<string, unknown> {
  return {
    ...camposDaLinha(linha),
    id: linha.id,
    registrado_por: '',
    grupo_id: '',
    parcela_n: '',
    parcelas: '',
    origem: 'recorrencia',
    criado_em: agora,
    atualizado_em: agora,
    excluido: false,
  };
}

/**
 * Faturas de cada cartão ativo, do mês de hoje até a que recebe uma compra
 * feita em `ate` (compras no fim de dezembro caem na fatura de janeiro).
 */
function gerarFaturas(leitura: Leitura, hoje: DataISO, ate: DataISO, plano: PlanoDeGeracao): void {
  const existentes = new Set(leitura.faturas.registros.map(({ dados }) => lerTexto(dados.id)));
  for (const { linha, dados } of leitura.cartoes.registros) {
    if (lerTexto(dados.ativo) !== '' && !lerBooleano(dados.ativo)) continue;
    const cartao: CicloDoCartao = {
      id: lerTexto(dados.id),
      fechamento: Number(dados.fechamento),
      vencimento: Number(dados.vencimento),
    };
    if (!cartao.id || !diaValido(cartao.fechamento) || !diaValido(cartao.vencimento)) {
      plano.avisos.push(`Cartões, linha ${linha}: id, fechamento ou vencimento inválido`);
      continue;
    }
    for (const fatura of faturasEntre(cartao, mesDe(hoje), mesDaFatura(cartao, ate))) {
      if (!existentes.has(fatura.id)) plano.faturasNovas.push(linhaDaFatura(fatura));
    }
  }
}

function diaValido(dia: number): boolean {
  return Number.isInteger(dia) && dia >= 1 && dia <= 31;
}

function linhaDaFatura(fatura: Fatura): Record<string, unknown> {
  return {
    id: fatura.id,
    cartao: fatura.cartao,
    fecha_em: escreverData(fatura.fechaEm),
    vence_em: escreverData(fatura.venceEm),
    pago_em: '',
  };
}
