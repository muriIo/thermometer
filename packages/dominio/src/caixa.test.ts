import { describe, expect, it } from 'vitest';
import { efeitoNoCaixa } from './caixa';
import { centavos } from './centavos';
import type { Lancamento } from './lancamento';
import { SALGADO } from './lancamento.fixture';

const l = (campos: Partial<Lancamento>): Lancamento => ({ ...SALGADO, ...campos });

describe('efeitoNoCaixa', () => {
  it('à vista: entrada e estorno somam, saída e diário subtraem', () => {
    expect(efeitoNoCaixa(l({ tipo: 'entrada', valorCentavos: centavos(500000) }))).toBe(500000);
    expect(efeitoNoCaixa(l({ tipo: 'saida', valorCentavos: centavos(120000) }))).toBe(-120000);
    expect(efeitoNoCaixa(l({ tipo: 'diario', valorCentavos: centavos(800) }))).toBe(-800);
    expect(
      efeitoNoCaixa(l({ tipo: 'estorno', estorna: 'diario', valorCentavos: centavos(300) })),
    ).toBe(300);
  });

  it('cartão não mexe no caixa do dia: pesa na fatura', () => {
    expect(efeitoNoCaixa(l({ meio: 'cartao', cartao: 'INTER' }))).toBe(0);
  });

  it('excluído não pesa', () => {
    expect(efeitoNoCaixa(l({ excluido: true }))).toBe(0);
  });

  it('previsto pesa igual a confirmado (ADR 0003)', () => {
    expect(efeitoNoCaixa(l({ status: 'previsto' }))).toBe(-800);
  });
});
