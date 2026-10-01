import { describe, expect, it } from 'vitest';
import { lerTabela } from './tabela';
import { conferirFaturaIds, conferirFormula, normalizarFormula } from './verificar';

describe('conferirFormula', () => {
  const esperada = `=SUMIFS('Faturas'!G:G,'Faturas'!F:F,DATE(2026,11,5))`;

  it('aceita a fórmula reescrita pelo Sheets', () => {
    expect(
      conferirFormula('x', esperada, '=sumifs(Faturas!G:G, Faturas!F:F, DATE(2026,11,5))'),
    ).toEqual([]);
  });

  it('acusa fórmula perdida, trocada ou dia inexistente preenchido', () => {
    expect(conferirFormula('x', esperada, '')).toEqual([
      { onde: 'x', problema: 'perdeu a fórmula' },
    ]);
    expect(conferirFormula('x', esperada, '=1800+120')[0]?.problema).toBe(
      'fórmula diferente da gerada',
    );
    expect(conferirFormula('x', '', '=1')[0]?.problema).toMatch(/vazia/);
    expect(conferirFormula('x', '', '')).toEqual([]);
  });

  it('normaliza aspas, espaços e caixa', () => {
    expect(normalizarFormula(`= sum('A b'!C:C)`)).toBe('=SUM(AB!C:C)');
  });
});

describe('conferirFaturaIds', () => {
  const cartoes = lerTabela([
    ['id', 'fechamento', 'vencimento'],
    ['INTER', 24, 1],
  ]);
  const cabecalho = ['data', 'meio', 'cartao', 'parcela_n', 'excluido', 'fatura_id'];

  it('aceita quando a fórmula dá o mesmo que o domínio', () => {
    const lancamentos = lerTabela([
      cabecalho,
      [new Date(2026, 9, 24), 'cartao', 'INTER', 2, false, 'INTER-2026-12'],
      [new Date(2026, 9, 23), 'cartao', 'INTER', '', false, 'INTER-2026-10'],
      [new Date(2026, 9, 23), 'avista', '', '', false, ''],
    ]);
    expect(conferirFaturaIds(lancamentos, cartoes)).toEqual([]);
  });

  it('acusa divergência, cartão desconhecido e ignora excluídos', () => {
    const lancamentos = lerTabela([
      cabecalho,
      [new Date(2026, 9, 24), 'cartao', 'INTER', '', false, 'INTER-2026-10'],
      [new Date(2026, 9, 24), 'cartao', 'NUBANK', '', false, ''],
      [new Date(2026, 9, 24), 'cartao', 'INTER', '', true, 'lixo'],
    ]);
    expect(conferirFaturaIds(lancamentos, cartoes)).toEqual([
      { onde: 'Lançamentos, linha 2', problema: 'fatura_id INTER-2026-10, esperado INTER-2026-11' },
      {
        onde: 'Lançamentos, linha 3',
        problema: 'compra no cartão sem cartão cadastrado ou sem data',
      },
    ]);
  });
});
