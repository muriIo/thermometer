import { dataISO } from '@termometro/dominio';
import { describe, expect, it } from 'vitest';
import {
  escreverData,
  lerBooleano,
  lerData,
  lerTabela,
  letraDaColuna,
  segmentosGravaveis,
  valoresDoSegmento,
} from './tabela';

describe('lerTabela', () => {
  it('lê pelo nome do cabeçalho, pula linhas vazias e guarda o número da linha', () => {
    const tabela = lerTabela([
      [' id ', 'valor', ''],
      ['a', 8, 'ignorado'],
      ['', '', ''],
      ['b', 12.5, ''],
    ]);
    expect(tabela.cabecalho).toEqual(['id', 'valor', '']);
    expect(tabela.registros).toEqual([
      { linha: 2, dados: { id: 'a', valor: 8 } },
      { linha: 4, dados: { id: 'b', valor: 12.5 } },
    ]);
  });

  it('aba vazia não tem registros', () => {
    expect(lerTabela([])).toEqual({ cabecalho: [], registros: [] });
  });
});

describe('segmentosGravaveis', () => {
  it('pula as colunas ƒ, inclusive no meio', () => {
    const cabecalho = ['id', 'fatura_id', 'data_caixa', 'valor', 'nova'];
    expect(segmentosGravaveis(cabecalho, ['fatura_id', 'data_caixa'])).toEqual([
      { inicio: 0, fim: 1 },
      { inicio: 3, fim: 5 },
    ]);
  });

  it('sem colunas ƒ é uma faixa só', () => {
    expect(segmentosGravaveis(['a', 'b'], [])).toEqual([{ inicio: 0, fim: 2 }]);
  });

  it('ƒ no fim não gera faixa vazia', () => {
    expect(segmentosGravaveis(['a', 'f'], ['f'])).toEqual([{ inicio: 0, fim: 1 }]);
  });
});

describe('valoresDoSegmento', () => {
  it('usa o campo informado, ou mantém o valor atual da célula', () => {
    const cabecalho = ['id', 'valor', 'status'];
    const segmento = { inicio: 0, fim: 3 };
    expect(
      valoresDoSegmento(cabecalho, segmento, { status: 'confirmado' }, ['x', 9, 'previsto']),
    ).toEqual(['x', 9, 'confirmado']);
    expect(valoresDoSegmento(cabecalho, segmento, { id: 'y' })).toEqual(['y', '', '']);
  });
});

describe('letraDaColuna', () => {
  it.each([
    [0, 'A'],
    [25, 'Z'],
    [26, 'AA'],
    [70, 'BS'],
    [701, 'ZZ'],
    [702, 'AAA'],
  ])('%i → %s', (indice, letra) => {
    expect(letraDaColuna(indice)).toBe(letra);
  });
});

describe('datas da planilha', () => {
  it('lê Date e texto ISO; ignora o resto', () => {
    expect(lerData(new Date(2026, 9, 24))).toBe('2026-10-24');
    expect(lerData(' 2026-10-24 ')).toBe('2026-10-24');
    expect(lerData('24/10/2026')).toBeNull();
    expect(lerData('')).toBeNull();
    expect(lerData(45000)).toBeNull();
    expect(lerData(new Date(Number.NaN))).toBeNull();
  });

  it('escreve como Date local, sem horário', () => {
    const data = escreverData(dataISO('2028-02-29'));
    expect([data.getFullYear(), data.getMonth(), data.getDate(), data.getHours()]).toEqual([
      2028, 1, 29, 0,
    ]);
    expect(lerData(data)).toBe('2028-02-29');
  });
});

describe('lerBooleano', () => {
  it('aceita booleano e texto TRUE', () => {
    expect(lerBooleano(true)).toBe(true);
    expect(lerBooleano('true')).toBe(true);
    expect(lerBooleano(false)).toBe(false);
    expect(lerBooleano('')).toBe(false);
    expect(lerBooleano(undefined)).toBe(false);
  });
});
