import { describe, expect, it } from 'vitest';
import { centavos, deReais, formatarReais, paraReais, somar } from './centavos';

describe('centavos', () => {
  it('aceita inteiros seguros', () => {
    expect(centavos(800)).toBe(800);
    expect(centavos(0)).toBe(0);
    expect(centavos(-150)).toBe(-150);
  });

  it('recusa valores fracionários ou não finitos', () => {
    expect(() => centavos(8.5)).toThrow(RangeError);
    expect(() => centavos(Number.NaN)).toThrow(RangeError);
    expect(() => centavos(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => centavos(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });
});

describe('deReais', () => {
  it('converte valores lidos da planilha arredondando ao centavo', () => {
    expect(deReais(8)).toBe(800);
    expect(deReais(7671.86)).toBe(767186);
    expect(deReais(0.1 + 0.2)).toBe(30);
    expect(deReais(-36.6)).toBe(-3660);
  });
});

describe('paraReais', () => {
  it('converte para escrever na planilha', () => {
    expect(paraReais(centavos(767186))).toBe(7671.86);
    expect(paraReais(centavos(5))).toBe(0.05);
  });
});

describe('somar', () => {
  it('soma sem erro de ponto flutuante', () => {
    expect(somar([centavos(10), centavos(20)])).toBe(30);
    expect(somar([])).toBe(0);
  });
});

describe('formatarReais', () => {
  it('formata no padrão brasileiro', () => {
    expect(formatarReais(centavos(800))).toBe('R$ 8,00');
    expect(formatarReais(centavos(5))).toBe('R$ 0,05');
    expect(formatarReais(centavos(123456789))).toBe('R$ 1.234.567,89');
    expect(formatarReais(centavos(-3660))).toBe('-R$ 36,60');
    expect(formatarReais(centavos(0))).toBe('R$ 0,00');
  });
});
