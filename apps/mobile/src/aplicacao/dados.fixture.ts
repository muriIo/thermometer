// Dados de exemplo para os testes da aplicação.
import type { LancamentoSalvo, LinhaNova } from '@termometro/contract';
import { lancamentoDaLinhaNova } from '@termometro/contract';
import { dataISO, versao } from '@termometro/dominio';
import type { Operacao, OperacaoEditar, OperacaoExcluir, OperacaoLancar } from './operacao.ts';

export const HOJE = dataISO('2026-11-05');

export function linhaNova(campos: Partial<LinhaNova> = {}): LinhaNova {
  return {
    id: 'linha-000001',
    data: HOJE,
    valorCentavos: 800,
    tipo: 'diario',
    quem: 'Thays',
    meio: 'avista',
    status: 'confirmado',
    ...campos,
  };
}

/** Linha como o script devolveria, com a `versao` calculada pelo domínio. */
export function salvo(campos: Partial<LinhaNova> = {}): LancamentoSalvo {
  const lancamento = lancamentoDaLinhaNova(linhaNova(campos));
  return {
    ...lancamento,
    versao: versao(lancamento),
    origem: 'app',
    registradoPor: 'Thays',
    faturaId: '',
    dataCaixa: lancamento.data,
  };
}

const comum = { tentativas: 0, ultimoErro: null, travada: false };

export function opLancar(
  seq: number,
  linhas: LinhaNova[],
  extra: Partial<Operacao> = {},
): OperacaoLancar {
  return { ...comum, opId: `op-${seq}`, seq, acao: 'lancar', linhas, ...extra } as OperacaoLancar;
}

export function opEditar(
  seq: number,
  campos: Omit<OperacaoEditar, keyof typeof comum | 'opId' | 'seq' | 'acao'>,
): OperacaoEditar {
  return { ...comum, opId: `op-${seq}`, seq, acao: 'editar', ...campos };
}

export function opExcluir(
  seq: number,
  campos: Omit<OperacaoExcluir, keyof typeof comum | 'opId' | 'seq' | 'acao'>,
): OperacaoExcluir {
  return { ...comum, opId: `op-${seq}`, seq, acao: 'excluir', ...campos };
}
