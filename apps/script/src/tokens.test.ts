import { describe, expect, it } from 'vitest';
import { autenticar, lerTokens } from './tokens';

describe('lerTokens', () => {
  it('lê o JSON das Propriedades do Script', () => {
    expect(lerTokens('{"abc":"Murilo"}')).toEqual({ abc: 'Murilo' });
  });

  it('ignora propriedade ausente ou formato inesperado', () => {
    expect(lerTokens(null)).toEqual({});
    expect(lerTokens('[]')).toEqual({});
    expect(lerTokens('{"abc":1,"":"x"}')).toEqual({});
  });
});

describe('autenticar', () => {
  const tokens = { abc: 'Murilo', def: 'Thays' };

  it('encontra o dono', () => {
    expect(autenticar(tokens, 'def')).toBe('Thays');
  });

  it('recusa prefixos, extensões e vazio', () => {
    expect(autenticar(tokens, 'ab')).toBeNull();
    expect(autenticar(tokens, 'abcd')).toBeNull();
    expect(autenticar(tokens, '')).toBeNull();
  });
});
