import { describe, expect, it } from 'vitest';
import { centavos, somar } from './centavos';
import { dataISO } from './datas';
import { dividirEmParcelas, parcelar } from './parcelas';

function contador(): () => string {
  let n = 0;
  return () => `id-${n++}`;
}

describe('dividirEmParcelas', () => {
  it('R$ 100 em 3× deixa a sobra na 1ª parcela', () => {
    expect(dividirEmParcelas(centavos(10000), 3)).toEqual([3334, 3333, 3333]);
  });

  it('a soma das parcelas é sempre o total', () => {
    for (const [total, n] of [
      [10000, 7],
      [767186, 12],
      [5, 5],
      [99999, 10],
    ] as const) {
      const parcelas = dividirEmParcelas(centavos(total), n);
      expect(parcelas).toHaveLength(n);
      expect(somar(parcelas)).toBe(total);
    }
  });

  it('divisão exata não gera sobra', () => {
    expect(dividirEmParcelas(centavos(900), 3)).toEqual([300, 300, 300]);
  });

  it('1 parcela é o próprio total', () => {
    expect(dividirEmParcelas(centavos(1234), 1)).toEqual([1234]);
  });

  it.each([0, -1, 2.5, Number.NaN])('recusa %s parcelas', (n) => {
    expect(() => dividirEmParcelas(centavos(1000), n)).toThrow(RangeError);
  });

  it('recusa total menor que o número de parcelas', () => {
    expect(() => dividirEmParcelas(centavos(2), 3)).toThrow(RangeError);
  });
});

describe('parcelar no cartão', () => {
  const compra = {
    data: dataISO('2026-10-24'),
    valorCentavos: centavos(10000),
    meio: 'cartao' as const,
    cartao: 'INTER',
    descricao: 'Tênis',
  };

  it('todas as parcelas ficam na data da compra e nascem confirmadas', () => {
    const parcelas = parcelar(compra, 3, contador());
    expect(parcelas.map((p) => p.data)).toEqual(['2026-10-24', '2026-10-24', '2026-10-24']);
    expect(parcelas.map((p) => p.status)).toEqual(['confirmado', 'confirmado', 'confirmado']);
  });

  it('numera as parcelas, compartilha o grupo e preserva os outros campos', () => {
    const parcelas = parcelar(compra, 3, contador());
    expect(parcelas[0]).toEqual({
      ...compra,
      id: 'id-1',
      grupoId: 'id-0',
      parcelaN: 1,
      parcelas: 3,
      valorCentavos: 3334,
      status: 'confirmado',
    });
    expect(parcelas.map((p) => p.grupoId)).toEqual(['id-0', 'id-0', 'id-0']);
    expect(parcelas.map((p) => p.id)).toEqual(['id-1', 'id-2', 'id-3']);
    expect(parcelas.map((p) => p.parcelaN)).toEqual([1, 2, 3]);
  });
});

describe('parcelar à vista', () => {
  const gasto = {
    data: dataISO('2026-12-31'),
    valorCentavos: centavos(30000),
    meio: 'avista' as const,
  };

  it('parcela k cai k−1 meses depois, com dia 31 virando o último dia do mês', () => {
    const parcelas = parcelar(gasto, 4, contador());
    expect(parcelas.map((p) => p.data)).toEqual([
      '2026-12-31',
      '2027-01-31',
      '2027-02-28',
      '2027-03-31',
    ]);
  });

  it('só a 1ª nasce confirmada', () => {
    const parcelas = parcelar(gasto, 3, contador());
    expect(parcelas.map((p) => p.status)).toEqual(['confirmado', 'previsto', 'previsto']);
  });
});
