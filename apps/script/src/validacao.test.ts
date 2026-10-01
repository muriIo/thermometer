import { describe, expect, it } from 'vitest';
import { compararSaldos, resumir, type SaldoDoDia } from './validacao';

const saldo = (mes: number, dia: number, antes: number, depois: number): SaldoDoDia => ({
  ano: 2026,
  mes,
  dia,
  antes,
  depois,
});

describe('compararSaldos', () => {
  it('ignora diferença abaixo de meio centavo (ponto flutuante)', () => {
    const relatorio = compararSaldos([saldo(10, 5, 0.1 + 0.2, 0.3)]);
    expect(relatorio).toEqual({ fimDeMesDivergente: [], explicadas: [], inexplicadas: [] });
  });

  it('linha 31 é fim de mês; último dia real de mês curto é explicado pela regra do dia 31', () => {
    const relatorio = compararSaldos([
      saldo(11, 31, 100, 90),
      saldo(11, 30, 100, 90),
      saldo(2, 28, 100, 90),
      saldo(2, 29, 100, 90),
      saldo(10, 30, 100, 90),
      saldo(11, 15, 100, 90),
    ]);
    expect(relatorio.fimDeMesDivergente.map((s) => [s.mes, s.dia])).toEqual([[11, 31]]);
    expect(relatorio.explicadas.map((s) => [s.mes, s.dia])).toEqual([
      [11, 30],
      [2, 28],
      [2, 29],
    ]);
    expect(relatorio.inexplicadas.map((s) => [s.mes, s.dia])).toEqual([
      [10, 30],
      [11, 15],
    ]);
  });
});

describe('resumir', () => {
  it('diz se o critério da Fase 1 foi cumprido', () => {
    expect(resumir(compararSaldos([saldo(11, 30, 1, 2)]))).toMatch(/^✅/);
    const reprovado = resumir(compararSaldos([saldo(11, 31, 1, 2)]));
    expect(reprovado).toMatch(/^❌/);
    expect(reprovado).toContain('31/11/2026: 1.00 → 2.00');
  });
});
