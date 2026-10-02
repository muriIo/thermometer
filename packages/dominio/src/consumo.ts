import { type Centavos, centavos } from './centavos';
import type { DataISO } from './datas';
import type { Lancamento } from './lancamento';

/**
 * Consumo do Diário num dia, que o termômetro compara com a Previsão
 * (CONTEXT.md, "Consumo"): pela data da compra, à vista + cartão, menos
 * estornos do Diário. Parcelado conta o total no dia da compra, então só a
 * parcela 1 conta, com o valor do grupo inteiro (PROJECT.md, 5.5).
 */
export function consumoDoDiario(lancamentos: readonly Lancamento[], data: DataISO): Centavos {
  const ativos = lancamentos.filter((l) => !l.excluido);
  const totalDoGrupo = new Map<string, number>();
  for (const l of ativos) {
    if (l.grupoId)
      totalDoGrupo.set(l.grupoId, (totalDoGrupo.get(l.grupoId) ?? 0) + l.valorCentavos);
  }
  let total = 0;
  for (const l of ativos) if (l.data === data) total += peso(l, totalDoGrupo);
  return centavos(total);
}

function peso(l: Lancamento, totalDoGrupo: ReadonlyMap<string, number>): number {
  if (l.tipo === 'estorno') return l.estorna === 'diario' ? -l.valorCentavos : 0;
  if (l.tipo !== 'diario') return 0;
  if (!l.grupoId) return l.valorCentavos;
  return l.parcelaN === 1 ? (totalDoGrupo.get(l.grupoId) ?? 0) : 0;
}
