import { describe, expect, it } from 'vitest';
import { ABAS, DEFINICOES, definicao, planejarEstrutura } from './esquema';

describe('DEFINICOES', () => {
  it('toda coluna ƒ, de texto ou de data existe na aba', () => {
    for (const def of DEFINICOES) {
      for (const coluna of [...def.calculadas, ...def.texto, ...def.datas]) {
        expect(def.colunas, `${def.nome}.${coluna}`).toContain(coluna);
      }
      for (const linha of def.linhasIniciais) expect(linha).toHaveLength(def.colunas.length);
    }
  });

  it('Lançamentos segue PROJECT.md 5.1, com fatura_id e data_caixa calculadas', () => {
    expect(definicao(ABAS.lancamentos).calculadas).toEqual(['fatura_id', 'data_caixa']);
    expect(definicao(ABAS.lancamentos).colunas).toHaveLength(22);
  });
});

describe('planejarEstrutura', () => {
  it('planilha sem as abas novas: cria todas', () => {
    const ajustes = planejarEstrutura(() => null);
    expect(ajustes.map((a) => [a.tipo, a.definicao.nome])).toEqual(
      DEFINICOES.map((def) => ['criar', def.nome]),
    );
  });

  it('aba existente: só acrescenta as colunas que faltam e ignora as que sobram', () => {
    const ajustes = planejarEstrutura((nome) =>
      nome === ABAS.previsao ? ['observacao', 'mes'] : definicao(nome).colunas,
    );
    expect(ajustes).toEqual([
      { tipo: 'acrescentar', definicao: definicao(ABAS.previsao), colunas: ['diario_por_dia'] },
    ]);
  });

  it('modelo completo: nada a fazer', () => {
    expect(planejarEstrutura((nome) => definicao(nome).colunas)).toEqual([]);
  });

  it('definição de aba desconhecida é erro', () => {
    expect(() => definicao('2026' as never)).toThrow();
  });
});
