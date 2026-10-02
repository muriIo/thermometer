import type { DataISO } from './datas';
import type { Lancamento } from './lancamento';

/** Previstos de hoje e vencidos ainda não confirmados (CONTEXT.md, "A confirmar"), do mais antigo. */
export function aConfirmar<T extends Lancamento>(lancamentos: readonly T[], hoje: DataISO): T[] {
  return lancamentos
    .filter((l) => !l.excluido && l.status === 'previsto' && l.data <= hoje)
    .sort((a, b) => a.data.localeCompare(b.data));
}
