/**
 * Operações da fila (PROJECT.md, 8.4): o que o app ainda precisa enviar ao
 * script, na ordem em que o usuário fez.
 */
import type { Edicao, LinhaNova } from '@termometro/contract';
import type { EscopoDaExclusao } from '@termometro/dominio';

type Comum = {
  readonly opId: string;
  /** Ordem de envio. */
  readonly seq: number;
  readonly tentativas: number;
  readonly ultimoErro: string | null;
  /** Recusada pelo script de um jeito que reenviar não resolve; fica até o usuário descartar. */
  readonly travada: boolean;
};

export type OperacaoLancar = Comum & {
  readonly acao: 'lancar';
  readonly linhas: readonly LinhaNova[];
};

/**
 * `versaoVista` nula: a versão vem da operação anterior sobre o mesmo
 * lançamento, quando ela for concluída. `versaoEsperada` é a versão da linha
 * depois desta edição; serve para reconhecer um reenvio que já tinha sido
 * aplicado (o script responde `CONFLICT`, porque a versão já mudou).
 */
export type OperacaoEditar = Comum & {
  readonly acao: 'editar';
  readonly id: string;
  readonly edicao: Edicao;
  readonly versaoVista: string | null;
  readonly versaoEsperada: string | null;
};

export type OperacaoExcluir = Comum & {
  readonly acao: 'excluir';
  readonly id: string;
  readonly escopo: EscopoDaExclusao;
  readonly versaoVista: string | null;
};

export type Operacao = OperacaoLancar | OperacaoEditar | OperacaoExcluir;

/** Ids dos lançamentos que a operação toca. */
export function alvos(operacao: Operacao): string[] {
  return operacao.acao === 'lancar' ? operacao.linhas.map((l) => l.id) : [operacao.id];
}

export function emOrdem(fila: readonly Operacao[]): Operacao[] {
  return [...fila].sort((a, b) => a.seq - b.seq);
}

export function proximoSeq(fila: readonly Operacao[]): number {
  return fila.reduce((maior, op) => Math.max(maior, op.seq), 0) + 1;
}
