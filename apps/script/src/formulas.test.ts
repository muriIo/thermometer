import { dataISO } from '@termometro/dominio';
import { describe, expect, it } from 'vitest';
import { ABAS, definicao } from './esquema';
import {
  celulasDoDia,
  diasDoAnoAPartirDe,
  formulaCalculada,
  formulasDoDia,
  type Letras,
} from './formulas';
import { letraDaColuna } from './tabela';

/** Letras da planilha recém-criada, na ordem das definições. */
const letras: Letras = (aba, coluna) => {
  const indice = definicao(aba).colunas.indexOf(coluna);
  if (indice < 0) throw new Error(`${aba}.${coluna}`);
  return letraDaColuna(indice);
};

describe('celulasDoDia', () => {
  it('segue o layout dos blocos (PROJECT.md 3.1)', () => {
    // Jan A:E → Entrada em B (2); dia 1 na linha 3.
    expect(celulasDoDia(2026, 1, 1)).toEqual({
      aba: '2026',
      mes: 1,
      linha: 3,
      entrada: 2,
      saida: 3,
      diario: 4,
    });
    // Out BC:BG → Entrada em BD; dia 24 na linha 26.
    const outubro = celulasDoDia(2026, 10, 24);
    expect([letraDaColuna(outubro.entrada - 1), outubro.linha]).toEqual(['BD', 26]);
    // Dez BO:BS → Diário em BR; dia 31 na linha 33.
    const dezembro = celulasDoDia(2027, 12, 31);
    expect([letraDaColuna(dezembro.diario - 1), dezembro.linha]).toEqual(['BR', 33]);
  });
});

describe('diasDoAnoAPartirDe', () => {
  it('começa no corte e marca dias inexistentes para ficarem vazios', () => {
    const dias = diasDoAnoAPartirDe(2026, dataISO('2026-10-24'));
    expect(dias[0]).toMatchObject({ data: '2026-10-24', celulas: { mes: 10, linha: 26 } });
    expect(dias).toHaveLength(8 + 31 + 31);
    const novembro31 = dias.find((d) => d.celulas.mes === 11 && d.celulas.linha === 33);
    expect(novembro31?.data).toBeNull();
    expect(dias.at(-1)?.data).toBe('2026-12-31');
  });

  it('ano inteiro depois do corte: 12 blocos de 31 linhas, fevereiro com 3 vazias', () => {
    const dias = diasDoAnoAPartirDe(2027, dataISO('2026-10-24'));
    expect(dias).toHaveLength(12 * 31);
    const fevereiro = dias.filter((d) => d.celulas.mes === 2);
    expect(fevereiro.filter((d) => d.data === null)).toHaveLength(3);
  });

  it('ano bissexto: 29/02 existe', () => {
    const fevereiro = diasDoAnoAPartirDe(2028, dataISO('2028-01-01')).filter(
      (d) => d.celulas.mes === 2,
    );
    expect(fevereiro.filter((d) => d.data === null)).toHaveLength(2);
  });

  it('ano inteiro antes do corte: nada', () => {
    expect(diasDoAnoAPartirDe(2025, dataISO('2026-10-24'))).toEqual([]);
  });
});

describe('formulasDoDia', () => {
  const formulas = formulasDoDia(dataISO('2026-11-05'), letras);
  const sumifs = (criterios: string) =>
    `SUMIFS('Lançamentos'!C:C,'Lançamentos'!V:V,DATE(2026,11,5),${criterios},'Lançamentos'!T:T,"<>TRUE")`;

  it('Entrada soma as entradas com data de caixa no dia', () => {
    expect(formulas.entrada).toBe(`=${sumifs(`'Lançamentos'!D:D,"entrada"`)}`);
  });

  it('Saída: à vista − estornos de saída à vista + faturas com data efetiva no dia', () => {
    expect(formulas.saida).toBe(
      `=${sumifs(`'Lançamentos'!D:D,"saida",'Lançamentos'!J:J,"avista"`)}` +
        `-${sumifs(`'Lançamentos'!D:D,"estorno",'Lançamentos'!E:E,"saida",'Lançamentos'!J:J,"avista"`)}` +
        `+SUMIFS('Faturas'!G:G,'Faturas'!F:F,DATE(2026,11,5))`,
    );
  });

  it('Diário: previsão do mês no futuro; consumo à vista − estornos no passado', () => {
    const diario = sumifs(`'Lançamentos'!D:D,"diario",'Lançamentos'!J:J,"avista"`);
    const estorno = sumifs(
      `'Lançamentos'!D:D,"estorno",'Lançamentos'!E:E,"diario",'Lançamentos'!J:J,"avista"`,
    );
    expect(formulas.diario).toBe(
      `=IF(DATE(2026,11,5)>TODAY(),IFERROR(XLOOKUP("2026-11",'Previsão'!A:A,'Previsão'!B:B),0)+${diario},${diario}-${estorno})`,
    );
  });

  it('segue a coluna pelo cabeçalho, não pela posição', () => {
    const movidas: Letras = (aba, coluna) =>
      aba === ABAS.lancamentos && coluna === 'valor' ? 'Z' : letras(aba, coluna);
    expect(formulasDoDia(dataISO('2026-11-05'), movidas).entrada).toContain(
      `SUMIFS('Lançamentos'!Z:Z,`,
    );
  });
});

describe('formulaCalculada', () => {
  it('fatura_id espelha mesDaFatura: dia ≥ fechamento e parcela deslocam o mês', () => {
    const formula = formulaCalculada(ABAS.lancamentos, 'fatura_id', letras);
    expect(formula.startsWith('={"fatura_id";ARRAYFORMULA(')).toBe(true);
    expect(formula).toContain(`XLOOKUP(cartao,'Cartões'!A2:A,'Cartões'!D2:D,0)`);
    expect(formula).toContain(
      '(DAY(dt)>=IF(fecha>ultimo,ultimo,fecha))+IF(parcela="",0,parcela-1)',
    );
    expect(formula).toContain(`cartao&"-"&YEAR(mes)&"-"&TEXT(MONTH(mes),"00")`);
  });

  it('data_caixa busca a data efetiva da fatura para compras no cartão', () => {
    expect(formulaCalculada(ABAS.lancamentos, 'data_caixa', letras)).toBe(
      `={"data_caixa";ARRAYFORMULA(IF('Lançamentos'!B2:B="","",IF('Lançamentos'!J2:J="cartao",` +
        `XLOOKUP('Lançamentos'!U2:U,'Faturas'!A2:A,'Faturas'!F2:F,""),'Lançamentos'!B2:B)))}`,
    );
  });

  it('Faturas: data efetiva, total e status', () => {
    expect(formulaCalculada(ABAS.faturas, 'data_efetiva', letras)).toContain(
      `IF('Faturas'!E2:E="",'Faturas'!D2:D,'Faturas'!E2:E)`,
    );
    const total = formulaCalculada(ABAS.faturas, 'total', letras);
    expect(total).toContain(`MAP('Faturas'!A2:A,LAMBDA(id,`);
    expect(total).toContain(`'Lançamentos'!D:D,"<>estorno"`);
    expect(total).toContain(`-SUMIFS(`);
    expect(formulaCalculada(ABAS.faturas, 'status', letras)).toContain(
      `IF(TODAY()>='Faturas'!C2:C,"fechada","aberta")`,
    );
  });

  it('coluna sem fórmula conhecida é erro', () => {
    expect(() => formulaCalculada(ABAS.cartoes, 'nome', letras)).toThrow();
  });
});
