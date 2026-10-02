import { dataISO } from '@termometro/dominio';
import { describe, expect, it } from 'vitest';
import { anosComAba, fimDaGeracao, formulaSaldoDeAbertura } from './ano';

describe('anosComAba', () => {
  it('só abas com nome de ano, em ordem', () => {
    expect(anosComAba(['2027', 'Lançamentos', '2026', 'Economia', '20271', '2028'])).toEqual([
      2026, 2027, 2028,
    ]);
  });
});

describe('fimDaGeracao', () => {
  it('é o horizonte quando as abas não vão além dele', () => {
    expect(fimDaGeracao(dataISO('2026-10-24'), [2026, 2027])).toBe('2027-12-31');
  });

  it('a aba do próximo ano criada antes da virada estende a geração', () => {
    expect(fimDaGeracao(dataISO('2026-10-24'), [2026, 2027, 2028])).toBe('2028-12-31');
  });

  it('o horizonte vale mesmo sem abas', () => {
    expect(fimDaGeracao(dataISO('2027-01-02'), [])).toBe('2028-12-31');
  });
});

describe('formulaSaldoDeAbertura', () => {
  it('reproduz a fórmula original de 1º de janeiro (PROJECT.md 3.2)', () => {
    expect(formulaSaldoDeAbertura(2027)).toBe("='2026'!BS33+(B3)-(C3+D3)");
    expect(formulaSaldoDeAbertura(2028)).toBe("='2027'!BS33+(B3)-(C3+D3)");
  });
});
