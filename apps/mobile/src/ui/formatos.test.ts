import { dataISO } from '@termometro/dominio';
import { describe, expect, it } from 'vitest';
import {
  centavosDoTeclado,
  dataCurta,
  dataPorExtenso,
  filtrarValor,
  teclar,
  textoDoValor,
} from './formatos.ts';

describe('datas', () => {
  it('por extenso, como no cabeçalho da Hoje', () => {
    expect(dataPorExtenso(dataISO('2026-10-01'))).toBe('Quinta, 1 de outubro');
    expect(dataPorExtenso(dataISO('2026-11-08'))).toBe('Domingo, 8 de novembro');
  });

  it('curta, para listas e botões', () => {
    expect(dataCurta(dataISO('2026-10-01'))).toBe('1/out');
  });
});

describe('teclado de valor', () => {
  const digitar = (teclas: string) => [...teclas].reduce(teclar, '');

  it.each([
    ['8', '8', 800],
    ['8,5', '8,5', 850],
    ['12,34', '12,34', 1234],
    ['12,345', '12,34', 1234],
    ['0008', '8', 800],
    [',5', '0,5', 50],
    ['1,,2', '1,2', 120],
    ['8<', '', 0],
    ['12,3<<', '12', 1200],
  ])('%s → "%s" (%i centavos)', (teclas, texto, centavos) => {
    expect(digitar(teclas)).toBe(texto);
    expect(centavosDoTeclado(digitar(teclas))).toBe(centavos);
  });

  it('para em 9 dígitos antes da vírgula', () => {
    expect(digitar('1234567890')).toBe('123456789');
  });
});

describe('campo de valor do sistema', () => {
  it('começa do valor em centavos, sem zeros à toa', () => {
    expect(textoDoValor(152000)).toBe('1520');
    expect(textoDoValor(152050)).toBe('1520,5');
    expect(textoDoValor(152005)).toBe('1520,05');
  });

  it('filtra o que o teclado decimal manda, aceitando ponto como vírgula', () => {
    expect(filtrarValor('1520.5')).toBe('1520,5');
    expect(filtrarValor('R$ 12,345')).toBe('12,34');
    expect(centavosDoTeclado(filtrarValor(textoDoValor(152005)))).toBe(152005);
  });
});
