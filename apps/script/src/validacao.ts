/**
 * Critério de pronto da Fase 1 (PROJECT.md, 9.6): saldo de fim de mês igual
 * ao de antes da migração, centavo por centavo. Diferença em dia
 * intermediário só pode vir da regra do dia 31.
 */
import { deReais, diasNoMes } from '@termometro/dominio';

export const COLUNAS_VALIDACAO = [
  'ano',
  'mes',
  'dia',
  'saldo_antes',
  'saldo_depois',
  'diferenca',
] as const;

export type SaldoDoDia = {
  readonly ano: number;
  readonly mes: number;
  /** Linha do bloco, 1–31. A linha 31 é o fim do mês (alimenta o mês seguinte). */
  readonly dia: number;
  readonly antes: number;
  readonly depois: number;
};

export type Relatorio = {
  readonly fimDeMesDivergente: SaldoDoDia[];
  readonly explicadas: SaldoDoDia[];
  readonly inexplicadas: SaldoDoDia[];
};

export function compararSaldos(saldos: readonly SaldoDoDia[]): Relatorio {
  const relatorio: Relatorio = { fimDeMesDivergente: [], explicadas: [], inexplicadas: [] };
  for (const saldo of saldos) {
    if (deReais(saldo.antes) === deReais(saldo.depois)) continue;
    if (saldo.dia === 31) relatorio.fimDeMesDivergente.push(saldo);
    else if (saldo.dia >= diasNoMes(saldo.ano, saldo.mes)) relatorio.explicadas.push(saldo);
    else relatorio.inexplicadas.push(saldo);
  }
  return relatorio;
}

export function resumir(relatorio: Relatorio): string {
  const rotulo = (s: SaldoDoDia) =>
    `${s.dia.toString().padStart(2, '0')}/${s.mes.toString().padStart(2, '0')}/${s.ano}: ` +
    `${s.antes.toFixed(2)} → ${s.depois.toFixed(2)}`;
  const pronto = relatorio.fimDeMesDivergente.length === 0 && relatorio.inexplicadas.length === 0;
  return [
    pronto ? '✅ Critério da Fase 1 cumprido.' : '❌ Critério da Fase 1 não cumprido.',
    `Fim de mês divergente: ${relatorio.fimDeMesDivergente.length}`,
    ...relatorio.fimDeMesDivergente.slice(0, 15).map(rotulo),
    `Dias com diferença sem explicação: ${relatorio.inexplicadas.length}`,
    ...relatorio.inexplicadas.slice(0, 15).map(rotulo),
    `Dias com diferença pela regra do dia 31: ${relatorio.explicadas.length}`,
  ].join('\n');
}
