import type { RespostaReferencias } from '@termometro/contract';
import { dataISO } from '@termometro/dominio';
import { describe, expect, it } from 'vitest';
import { HOJE } from './dados.fixture.ts';
import { linhasDoRascunho, type Rascunho } from './rascunho.ts';

const RASCUNHO: Rascunho = {
  data: HOJE,
  valorCentavos: 800,
  tipo: 'diario',
  categoria: 'Alimentação',
  descricao: 'Salgado',
  quem: 'Thays',
  meio: 'avista',
};

const REFERENCIAS: RespostaReferencias = {
  categorias: { gasto: [], receita: [] },
  cartoes: [],
  previsao: null,
  limites: { valorMaximoCentavos: 1_000_000, confirmarAcimaDiarioCentavos: 20_000 },
};

const ids = () => {
  let n = 0;
  return () => `id-${String(++n).padStart(6, '0')}`;
};

describe('linhasDoRascunho', () => {
  it('lançamento simples vira uma linha confirmada', () => {
    const resultado = linhasDoRascunho(RASCUNHO, REFERENCIAS, ids());
    expect(resultado).toEqual({
      ok: true,
      linhas: [{ id: 'id-000001', status: 'confirmado', ...RASCUNHO }],
    });
  });

  it('parcelado no cartão vira N linhas do mesmo grupo, somando o total', () => {
    const resultado = linhasDoRascunho(
      { ...RASCUNHO, valorCentavos: 10000, meio: 'cartao', cartao: 'INTER', parcelas: 3 },
      REFERENCIAS,
      ids(),
    );
    if (!resultado.ok) throw new Error(resultado.problema);

    expect(resultado.linhas.map((l) => [l.parcelaN, l.valorCentavos, l.data, l.grupoId])).toEqual([
      [1, 3334, HOJE, 'id-000001'],
      [2, 3333, HOJE, 'id-000001'],
      [3, 3333, HOJE, 'id-000001'],
    ]);
    expect(resultado.linhas.every((l) => l.parcelas === 3)).toBe(true);
  });

  it('parcelado à vista: parcelas nos meses seguintes, como previstas', () => {
    const resultado = linhasDoRascunho(
      { ...RASCUNHO, valorCentavos: 900, parcelas: 3 },
      REFERENCIAS,
      ids(),
    );
    if (!resultado.ok) throw new Error(resultado.problema);

    expect(resultado.linhas.map((l) => [l.data, l.status])).toEqual([
      [HOJE, 'confirmado'],
      [dataISO('2026-12-05'), 'previsto'],
      [dataISO('2027-01-05'), 'previsto'],
    ]);
  });

  it.each<[string, Partial<Rascunho>, string]>([
    ['valor zero', { valorCentavos: 0 }, 'valor'],
    ['valor com fração de centavo', { valorCentavos: 8.5 }, 'valor'],
    ['acima do valor máximo da planilha', { valorCentavos: 1_000_001 }, 'máximo'],
    ['cartão sem cartão', { meio: 'cartao' }, 'cartão'],
    ['mais parcelas que centavos', { valorCentavos: 2, parcelas: 3 }, 'parcelas'],
  ])('recusa %s', (_, campos, trecho) => {
    const resultado = linhasDoRascunho({ ...RASCUNHO, ...campos }, REFERENCIAS, ids());
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.problema).toContain(trecho);
  });

  it('sem referências ainda, só não verifica o valor máximo', () => {
    expect(linhasDoRascunho({ ...RASCUNHO, valorCentavos: 5_000_000 }, null, ids()).ok).toBe(true);
  });
});
