import { describe, expect, it } from 'vitest';
import { type CamposDeNegocio, problemaNosCampos } from './validacao';

const VALIDOS: CamposDeNegocio = {
  descricao: 'Salgado',
  tipo: 'diario',
  estorna: '',
  categoria: 'Alimentação',
  quem: 'Thays',
  meio: 'avista',
  cartao: '',
};

describe('problemaNosCampos', () => {
  it('aceita campos válidos e opcionais vazios', () => {
    expect(problemaNosCampos(VALIDOS)).toBeNull();
    expect(problemaNosCampos({ ...VALIDOS, categoria: '', quem: '', descricao: '' })).toBeNull();
    expect(problemaNosCampos({ ...VALIDOS, tipo: 'estorno', estorna: 'saida' })).toBeNull();
    expect(problemaNosCampos({ ...VALIDOS, meio: 'cartao', cartao: 'INTER' })).toBeNull();
  });

  it.each([
    [{ tipo: 'gasto' }, 'tipo inválido (gasto)'],
    [{ tipo: 'estorno' }, 'estorno sem "estorna" (diario ou saida)'],
    [{ estorna: 'diario' }, '"estorna" só vale para estorno'],
    [{ meio: 'pix' }, 'meio inválido (pix)'],
    [{ meio: 'cartao' }, 'meio cartão sem cartão'],
    [{ cartao: 'INTER' }, 'cartão informado em lançamento à vista'],
    [{ quem: 'Fulano' }, 'quem inválido (Fulano)'],
    [{ categoria: 'Mercado' }, 'categoria inválida (Mercado)'],
    [{ descricao: 'x'.repeat(81) }, 'descrição com mais de 80 caracteres'],
  ])('recusa %o', (campos, motivo) => {
    expect(problemaNosCampos({ ...VALIDOS, ...campos })).toBe(motivo);
  });
});
