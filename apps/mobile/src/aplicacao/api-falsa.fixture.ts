// Apps Script falso para os testes do núcleo: mesmas regras do script real
// (idempotência por id, conflito por versão, exclusão lógica), com rede que
// cai antes do pedido chegar ou depois de o script ter aplicado.
import {
  type Acao,
  aplicarEdicao,
  type CodigoErro,
  type LancamentoSalvo,
  lancamentoDaLinhaNova,
  type PayloadDe,
  type RespostaDe,
} from '@termometro/contract';
import {
  alcanceDaExclusao,
  consumoDoDiario,
  dataISO,
  type Lancamento,
  versao,
} from '@termometro/dominio';
import type { Agendador, Api, ResultadoDaApi } from './portas.ts';

export const TOKEN_BOM = 'token-da-thays';

type Linha = Lancamento & { readonly registradoPor: string };

/** `antes`: o pedido não chega. `depois`: o script aplica e a resposta se perde. */
type Queda = 'antes' | 'depois';

export class ApiFalsa implements Api {
  readonly linhas = new Map<string, Linha>();
  readonly chamadas: Acao[] = [];
  offline = false;
  saldoDoDiaCentavos = 100_000;
  tokens = new Map([[TOKEN_BOM, 'Thays']]);
  /** Erro do contrato forçado para a próxima chamada dessa ação. */
  readonly errosForcados = new Map<Acao, CodigoErro>();
  private readonly quedas: Queda[] = [];
  private portao: Promise<void> | null = null;

  /** Derruba as próximas chamadas, uma queda por chamada. */
  cair(...quedas: Queda[]): void {
    this.quedas.push(...quedas);
  }

  /** Segura a próxima chamada até a função devolvida ser chamada. */
  segurar(): () => void {
    let soltar = () => {};
    this.portao = new Promise((resolve) => {
      soltar = resolve;
    });
    return soltar;
  }

  /** Alguém mexe na linha direto na planilha. */
  editarAMao(id: string, campos: Partial<Lancamento>): void {
    const atual = this.linhas.get(id);
    if (atual) this.linhas.set(id, { ...atual, ...campos });
  }

  ativas(): Linha[] {
    return [...this.linhas.values()].filter((l) => !l.excluido);
  }

  async chamar<A extends Acao>(
    acao: A,
    payload: PayloadDe<A>,
    token: string,
  ): Promise<ResultadoDaApi<RespostaDe<A>>> {
    this.chamadas.push(acao);
    if (this.portao) {
      const portao = this.portao;
      this.portao = null;
      await portao;
    }
    const queda = this.offline ? 'antes' : this.quedas.shift();
    if (queda === 'antes') return { ok: false, falha: { tipo: 'rede', mensagem: 'sem rede' } };
    const nome = this.tokens.get(token);
    const forcado = this.errosForcados.get(acao);
    this.errosForcados.delete(acao);
    const resposta: ResultadoDaApi<unknown> = !nome
      ? erro('UNAUTHORIZED')
      : forcado
        ? erro(forcado)
        : this.executar(acao, payload, nome);
    if (queda === 'depois') return { ok: false, falha: { tipo: 'rede', mensagem: 'timeout' } };
    return resposta as ResultadoDaApi<RespostaDe<A>>;
  }

  private executar(acao: Acao, payload: unknown, nome: string): ResultadoDaApi<unknown> {
    switch (acao) {
      case 'ping':
        return ok({ versaoScript: 'falso', horaServidor: '', nome });
      case 'referencias':
        return ok({
          categorias: { gasto: [], receita: [] },
          cartoes: [{ id: 'INTER', nome: 'Inter', dono: 'Thays' }],
          previsao: { mes: '2026-11', diarioPorDiaCentavos: 5000 },
          limites: { valorMaximoCentavos: 10_000_000, confirmarAcimaDiarioCentavos: 20_000 },
        });
      case 'lancar':
        return this.lancar(payload as PayloadDe<'lancar'>, nome);
      case 'editar':
        return this.editar(payload as PayloadDe<'editar'>);
      case 'excluir':
        return this.excluir(payload as PayloadDe<'excluir'>);
      case 'listar': {
        const { de, ate } = payload as PayloadDe<'listar'>;
        const linhas = this.ativas().filter((l) => l.data >= de && l.data <= ate);
        return ok({ linhas: linhas.map(salvo) });
      }
      case 'resumo': {
        const { data } = payload as PayloadDe<'resumo'>;
        return ok({
          data,
          saldoDoDiaCentavos: this.saldoDoDiaCentavos,
          menorSaldoDoMes: null,
          diarioCaixaCentavos: null,
          consumoDoDiarioCentavos: consumoDoDiario(this.ativas(), dataISO(data)),
          previsaoCentavos: 5000,
          totaisDoMes: { entrada: 0, saida: 0, diario: 0, estorno: 0 },
          gastosPorCategoria: [],
          celulasSemFormula: 0,
        });
      }
    }
  }

  private lancar({ linhas }: PayloadDe<'lancar'>, nome: string): ResultadoDaApi<unknown> {
    for (const linha of linhas) {
      if (!this.linhas.has(linha.id)) {
        this.linhas.set(linha.id, { ...lancamentoDaLinhaNova(linha), registradoPor: nome });
      }
    }
    return ok({ linhas: linhas.map((l) => salvo(this.linhas.get(l.id) as Linha)) });
  }

  private editar({ id, versaoVista, ...edicao }: PayloadDe<'editar'>): ResultadoDaApi<unknown> {
    const atual = this.linhas.get(id);
    if (!atual || atual.excluido) return erro('NOT_FOUND');
    if (versao(atual) !== versaoVista) return erro('CONFLICT');
    const editado = aplicarEdicao(atual, edicao);
    this.linhas.set(id, editado);
    return ok({ linha: salvo(editado) });
  }

  private excluir({ id, versaoVista, escopo }: PayloadDe<'excluir'>): ResultadoDaApi<unknown> {
    const atual = this.linhas.get(id);
    if (!atual || atual.excluido) return erro('NOT_FOUND');
    if (versao(atual) !== versaoVista) return erro('CONFLICT');
    const alcance = alcanceDaExclusao(atual, [...this.linhas.values()], escopo);
    for (const l of alcance) this.linhas.set(l.id, { ...l, excluido: true });
    return ok({ excluidos: alcance.map((l) => l.id) });
  }
}

function salvo(linha: Linha): LancamentoSalvo {
  const { registradoPor, ...lancamento } = linha;
  return {
    ...lancamento,
    versao: versao(lancamento),
    origem: 'app',
    registradoPor,
    faturaId: '',
    dataCaixa: '',
  };
}

function ok(dados: unknown): ResultadoDaApi<unknown> {
  return { ok: true, dados };
}

function erro(codigo: CodigoErro): ResultadoDaApi<never> {
  return { ok: false, falha: { tipo: 'api', codigo, mensagem: codigo } };
}

/** Timers que só disparam quando o teste manda. */
export class AgendadorFalso implements Agendador {
  private tarefas: { ms: number; tarefa: () => void }[] = [];

  agendar(ms: number, tarefa: () => void): () => void {
    const item = { ms, tarefa };
    this.tarefas.push(item);
    return () => {
      this.tarefas = this.tarefas.filter((t) => t !== item);
    };
  }

  get atrasos(): number[] {
    return this.tarefas.map((t) => t.ms);
  }

  dispararTudo(): void {
    const tarefas = this.tarefas;
    this.tarefas = [];
    for (const { tarefa } of tarefas) tarefa();
  }
}
