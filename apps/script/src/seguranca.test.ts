import { describe, expect, it } from 'vitest';
import { podeEscrever } from './seguranca';

describe('podeEscrever', () => {
  const real = '16NNZnx2Ef5JlJhNke1l8HnQ8OqDceGAUa9CsXT_3F3s';

  it('Planilha Teste: sempre', () => {
    expect(podeEscrever('127v4llEbv6GMW-mccwB0abGlpvPpAA3mU0IKwz2GJEE', null)).toBe(true);
  });

  it('planilha real: só com PERMITIR_PLANILHA_REAL = sim', () => {
    expect(podeEscrever(real, null)).toBe(false);
    expect(podeEscrever(real, 'true')).toBe(false);
    expect(podeEscrever(real, 'sim')).toBe(true);
  });
});
