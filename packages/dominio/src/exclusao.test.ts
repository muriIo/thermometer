import { describe, expect, it } from 'vitest';
import { centavos } from './centavos';
import { dataISO, somarMeses } from './datas';
import { alcanceDaExclusao } from './exclusao';
import type { Lancamento } from './lancamento';
import { SALGADO } from './lancamento.fixture';

const parcela = (n: number, campos: Partial<Lancamento> = {}): Lancamento => ({
  ...SALGADO,
  id: `p${n}`,
  valorCentavos: centavos(1000),
  grupoId: 'g',
  parcelaN: n,
  parcelas: 4,
  status: 'previsto',
  data: somarMeses(dataISO('2026-10-05'), n - 1),
  ...campos,
});

describe('alcanceDaExclusao', () => {
  it('"só esta" alcança só o alvo', () => {
    const grupo = [parcela(1), parcela(2), parcela(3)];
    expect(alcanceDaExclusao(parcela(2), grupo, 'so_esta').map((l) => l.id)).toEqual(['p2']);
  });

  it('"esta e as próximas" pega as parcelas seguintes, menos as à vista já confirmadas', () => {
    const grupo = [
      parcela(1, { status: 'confirmado' }),
      parcela(2),
      parcela(3, { status: 'confirmado' }),
      parcela(4),
    ];
    const ids = alcanceDaExclusao(parcela(2), grupo, 'esta_e_proximas').map((l) => l.id);
    expect(ids).toEqual(['p2', 'p4']);
  });

  it('no cartão todas as parcelas seguintes saem, mesmo confirmadas', () => {
    const cartao = { meio: 'cartao' as const, cartao: 'INTER', status: 'confirmado' as const };
    const grupo = [parcela(1, cartao), parcela(2, cartao), parcela(3, cartao)];
    const ids = alcanceDaExclusao(grupo[0] as Lancamento, grupo, 'esta_e_proximas').map(
      (l) => l.id,
    );
    expect(ids).toEqual(['p1', 'p2', 'p3']);
  });

  it('ignora outros grupos e parcelas já excluídas', () => {
    const grupo = [parcela(1), parcela(2, { excluido: true }), parcela(3, { grupoId: 'outro' })];
    const ids = alcanceDaExclusao(parcela(1), grupo, 'esta_e_proximas').map((l) => l.id);
    expect(ids).toEqual(['p1']);
  });

  it('sem grupo, "esta e as próximas" é só o alvo', () => {
    expect(alcanceDaExclusao(SALGADO, [SALGADO], 'esta_e_proximas')).toEqual([SALGADO]);
  });
});
