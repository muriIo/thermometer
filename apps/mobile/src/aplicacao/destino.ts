/**
 * O que a fila faz com cada falha (PROJECT.md, 8.4). Reenviar só é seguro
 * porque `lancar` é idempotente por `id` e `editar`/`excluir` levam a versão
 * vista; os casos abaixo cobrem o reenvio de algo que já tinha sido aplicado
 * mas cuja resposta se perdeu.
 */

import type { Operacao } from './operacao.ts';
import type { FalhaDaApi } from './portas.ts';

export type Destino =
  /** Transitório: a fila para e tenta de novo depois. */
  | 'tentar-depois'
  /** O token não vale mais: nada sai até reconectar. */
  | 'bloquear-token'
  /** O script não aceita esta versão do contrato: nada sai até atualizar o app. */
  | 'bloquear-versao'
  /** Reenviar não resolve; a operação fica travada à vista do usuário, sem sumir. */
  | 'travar'
  | 'ja-aplicada'
  /** A linha mudou na planilha; a operação sai da fila e o usuário é avisado. */
  | 'conflito'
  /** A linha não existe mais na planilha. */
  | 'sumiu'
  /** Reler a linha para saber se a edição já foi aplicada. */
  | 'verificar';

export function destinoDaFalha(acao: Operacao['acao'], falha: FalhaDaApi): Destino {
  if (falha.tipo === 'rede') return 'tentar-depois';
  switch (falha.codigo) {
    case 'INTERNAL':
      return 'tentar-depois';
    case 'UNAUTHORIZED':
      return 'bloquear-token';
    case 'UNSUPPORTED_VERSION':
      return 'bloquear-versao';
    case 'NOT_FOUND':
      if (acao === 'excluir') return 'ja-aplicada';
      return acao === 'editar' ? 'sumiu' : 'travar';
    case 'CONFLICT':
      if (acao === 'editar') return 'verificar';
      return acao === 'excluir' ? 'conflito' : 'travar';
    case 'INVALID_PAYLOAD':
      return 'travar';
  }
}

const ATRASO_INICIAL_MS = 2000;
const ATRASO_MAXIMO_MS = 5 * 60 * 1000;

/** Espera antes da tentativa seguinte, dobrando a cada falha (PROJECT.md, 8.4). */
export function atrasoDaTentativa(tentativas: number): number {
  return Math.min(ATRASO_INICIAL_MS * 2 ** (tentativas - 1), ATRASO_MAXIMO_MS);
}
