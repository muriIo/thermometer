import { describe, expect, it } from 'vitest';
import { dataISO, mesISO } from './datas';
import { type CicloDoCartao, fatura, faturaId, faturasEntre, mesDaFatura } from './fatura';

const INTER: CicloDoCartao = { id: 'INTER', fechamento: 24, vencimento: 1 };

describe('mesDaFatura', () => {
  it('compra antes do fechamento cai na fatura do mês', () => {
    expect(mesDaFatura(INTER, dataISO('2026-10-23'))).toBe('2026-10');
    expect(mesDaFatura(INTER, dataISO('2026-10-01'))).toBe('2026-10');
  });

  it('compra no dia 24 cai na fatura seguinte', () => {
    expect(mesDaFatura(INTER, dataISO('2026-10-24'))).toBe('2026-11');
  });

  it('compra depois do fechamento em dezembro vira o ano', () => {
    expect(mesDaFatura(INTER, dataISO('2026-12-31'))).toBe('2027-01');
  });

  it('a parcela k cai na k-ésima fatura a partir da compra', () => {
    const compra = dataISO('2026-10-24');
    expect(mesDaFatura(INTER, compra, 1)).toBe('2026-11');
    expect(mesDaFatura(INTER, compra, 2)).toBe('2026-12');
    expect(mesDaFatura(INTER, compra, 3)).toBe('2027-01');
  });

  it('fechamento no dia 31 vale como último dia em mês curto', () => {
    const cartao: CicloDoCartao = { id: 'X', fechamento: 31, vencimento: 10 };
    expect(mesDaFatura(cartao, dataISO('2027-02-27'))).toBe('2027-02');
    expect(mesDaFatura(cartao, dataISO('2027-02-28'))).toBe('2027-03');
    expect(mesDaFatura(cartao, dataISO('2028-02-28'))).toBe('2028-02');
    expect(mesDaFatura(cartao, dataISO('2028-02-29'))).toBe('2028-03');
  });
});

describe('fatura', () => {
  it('Inter: fecha dia 24 e vence dia 1 do mês seguinte', () => {
    expect(fatura(INTER, mesISO('2026-10'))).toEqual({
      id: 'INTER-2026-10',
      cartao: 'INTER',
      fechaEm: '2026-10-24',
      venceEm: '2026-11-01',
    });
  });

  it('a fatura de dezembro vence em janeiro do ano seguinte', () => {
    expect(fatura(INTER, mesISO('2027-12')).venceEm).toBe('2028-01-01');
  });

  it('vencimento depois do fechamento vence no mesmo mês', () => {
    const cartao: CicloDoCartao = { id: 'Y', fechamento: 3, vencimento: 10 };
    expect(fatura(cartao, mesISO('2026-10'))).toMatchObject({
      fechaEm: '2026-10-03',
      venceEm: '2026-10-10',
    });
  });

  it('fechamento e vencimento em dia inexistente viram o último dia', () => {
    const cartao: CicloDoCartao = { id: 'Z', fechamento: 31, vencimento: 30 };
    expect(fatura(cartao, mesISO('2027-01'))).toMatchObject({
      fechaEm: '2027-01-31',
      venceEm: '2027-02-28',
    });
  });

  it('o id usa o mês de fechamento', () => {
    expect(faturaId('INTER', mesISO('2027-03'))).toBe('INTER-2027-03');
  });
});

describe('faturasEntre', () => {
  it('gera uma fatura por mês, inclusive nas pontas, virando o ano', () => {
    const faturas = faturasEntre(INTER, mesISO('2026-11'), mesISO('2027-02'));
    expect(faturas.map((f) => f.id)).toEqual([
      'INTER-2026-11',
      'INTER-2026-12',
      'INTER-2027-01',
      'INTER-2027-02',
    ]);
  });

  it('intervalo invertido não gera nada', () => {
    expect(faturasEntre(INTER, mesISO('2027-01'), mesISO('2026-12'))).toEqual([]);
  });
});
