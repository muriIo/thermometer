import { describe, expect, it } from 'vitest';
import { planejarParcelamento } from './parcelar-linha';

const AGORA = new Date(2026, 10, 10, 9, 0);

function registro(dados: Record<string, unknown>) {
  return {
    linha: 7,
    dados: {
      id: 'linha-1',
      data: new Date(2026, 10, 10),
      valor: 100,
      tipo: 'saida',
      estorna: '',
      categoria: 'Compras',
      descricao: 'Tênis',
      quem: 'Thays',
      meio: 'cartao',
      cartao: 'INTER',
      parcelas: 3,
      ...dados,
    },
  };
}

function contador(): () => string {
  let n = 0;
  return () => `uuid-${n++}`;
}

describe('planejarParcelamento', () => {
  it('cartão: R$ 100 em 3× na data da compra, todas confirmadas, sobra na 1ª', () => {
    const plano = planejarParcelamento(registro({}), AGORA, contador());
    if (typeof plano === 'string') throw new Error(plano);
    expect(plano.primeira).toMatchObject({
      id: 'linha-1',
      valor: 33.34,
      parcela_n: 1,
      parcelas: 3,
      grupo_id: 'uuid-0',
      status: 'confirmado',
      origem: 'planilha',
      descricao: 'Tênis',
    });
    expect(plano.demais.map((p) => [p.valor, p.parcela_n, p.data, p.status])).toEqual([
      [33.33, 2, new Date(2026, 10, 10), 'confirmado'],
      [33.33, 3, new Date(2026, 10, 10), 'confirmado'],
    ]);
    expect(new Set(plano.demais.map((p) => p.grupo_id))).toEqual(new Set(['uuid-0']));
  });

  it('à vista: parcela k um mês depois, só a 1ª confirmada', () => {
    const plano = planejarParcelamento(
      registro({ meio: 'avista', cartao: '', data: new Date(2027, 0, 31), parcelas: 2 }),
      AGORA,
      contador(),
    );
    if (typeof plano === 'string') throw new Error(plano);
    expect([plano.primeira.status, plano.demais[0]?.status]).toEqual(['confirmado', 'previsto']);
    expect(plano.demais[0]?.data).toEqual(new Date(2027, 1, 28));
  });

  it('linha sem id ganha um', () => {
    const plano = planejarParcelamento(registro({ id: '' }), AGORA, contador());
    if (typeof plano === 'string') throw new Error(plano);
    expect(plano.primeira.id).toBe('uuid-1');
  });

  it.each([
    [{ grupo_id: 'g' }, 'a linha já faz parte de um parcelamento'],
    [{ excluido: true }, 'a linha está excluída'],
    [{ data: '' }, 'data vazia ou inválida'],
    [{ valor: 0 }, 'valor inválido'],
    [{ parcelas: 1 }, 'preencha "parcelas" com 2 ou mais'],
    [{ cartao: '' }, 'meio cartão sem cartão'],
  ])('recusa %o', (dados, motivo) => {
    expect(planejarParcelamento(registro(dados), AGORA, contador())).toBe(motivo);
  });
});
