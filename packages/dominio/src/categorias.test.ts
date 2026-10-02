import { describe, expect, it } from 'vitest';
import { CATEGORIAS_GASTO, CATEGORIAS_RECEITA, nomesDeCategorias } from './categorias';

describe('categorias', () => {
  it('16 de gasto e 4 de receita, como no PROJECT.md 5.3', () => {
    expect(CATEGORIAS_GASTO).toHaveLength(16);
    expect(CATEGORIAS_RECEITA).toHaveLength(4);
  });

  it('nomes sem repetição, inclusive Empréstimos nas duas listas', () => {
    const nomes = nomesDeCategorias();
    expect(nomes).toHaveLength(19);
    expect(nomes.filter((n) => n === 'Empréstimos')).toHaveLength(1);
  });
});
