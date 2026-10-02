import { type Centavos, centavos } from './centavos';
import type { Lancamento } from './lancamento';

/**
 * Quanto o lançamento move o saldo no dia da `data`, com sinal. Só à vista:
 * no cartão o dinheiro sai na fatura (CONTEXT.md, "Caixa"). Previsto pesa
 * igual a confirmado (ADR 0003). O app usa isto só para estimar o saldo
 * offline sobre o último saldo lido da planilha (ADR 0007), nunca para
 * calcular o saldo.
 */
export function efeitoNoCaixa(lancamento: Lancamento): Centavos {
  if (lancamento.excluido || lancamento.meio !== 'avista') return centavos(0);
  const entra = lancamento.tipo === 'entrada' || lancamento.tipo === 'estorno';
  return centavos(entra ? lancamento.valorCentavos : -lancamento.valorCentavos);
}
