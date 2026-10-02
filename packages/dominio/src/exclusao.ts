import type { Lancamento } from './lancamento';

export const ESCOPOS_DE_EXCLUSAO = ['so_esta', 'esta_e_proximas'] as const;
export type EscopoDaExclusao = (typeof ESCOPOS_DE_EXCLUSAO)[number];

/**
 * O que uma exclusão alcança (PROJECT.md, 6.2.1): o alvo e, em "esta e as
 * próximas", as parcelas seguintes do mesmo grupo, menos as à vista já
 * confirmadas, que já saíram da conta e não mudam (PROJECT.md, 5.5).
 */
export function alcanceDaExclusao<T extends Lancamento>(
  alvo: T,
  todos: readonly T[],
  escopo: EscopoDaExclusao,
): T[] {
  if (escopo === 'so_esta' || !alvo.grupoId) return [alvo];
  const proximas = todos.filter((l) => {
    const depois = (l.parcelaN ?? 0) > (alvo.parcelaN ?? 0);
    const fixa = l.meio === 'avista' && l.status === 'confirmado';
    return l.grupoId === alvo.grupoId && depois && !l.excluido && !fixa;
  });
  return [alvo, ...proximas];
}
