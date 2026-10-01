import { describe, expect, it } from 'vitest';
import { centavos } from './centavos';
import { type DataISO, dataISO } from './datas';
import {
  datasDaRecorrencia,
  horizonte,
  type LinhaExistente,
  planejarRecorrencia,
} from './recorrencia';

const ALUGUEL = {
  id: 'rec-aluguel',
  dia: 5,
  inicio: dataISO('2026-10-24'),
  ativo: true,
  valorCentavos: centavos(250000),
  tipo: 'saida',
  descricao: 'Aluguel',
};

function contador(): () => string {
  let n = 0;
  return () => `id-${n++}`;
}

function existente(id: string, data: string, campos: Partial<LinhaExistente> = {}): LinhaExistente {
  const { id: recorrenciaId, dia: _d, inicio: _i, ativo: _a, ...resto } = ALUGUEL;
  return { ...resto, id, recorrenciaId, data: dataISO(data), status: 'previsto', ...campos };
}

const datas = (linhas: readonly { data: DataISO }[]) => linhas.map((l) => l.data);

describe('horizonte', () => {
  it('é 31/12 do ano seguinte', () => {
    expect(horizonte(dataISO('2026-10-24'))).toBe('2027-12-31');
    expect(horizonte(dataISO('2027-01-01'))).toBe('2028-12-31');
  });
});

describe('datasDaRecorrencia', () => {
  it('uma data por mês, começando na primeira ocorrência a partir do início', () => {
    expect(datasDaRecorrencia(ALUGUEL, ALUGUEL.inicio, dataISO('2027-01-31'))).toEqual([
      '2026-11-05',
      '2026-12-05',
      '2027-01-05',
    ]);
  });

  it('dia 31 vira o último dia de cada mês', () => {
    const regra = { ...ALUGUEL, dia: 31, inicio: dataISO('2027-01-01') };
    expect(datasDaRecorrencia(regra, regra.inicio, dataISO('2027-04-30'))).toEqual([
      '2027-01-31',
      '2027-02-28',
      '2027-03-31',
      '2027-04-30',
    ]);
  });

  it('respeita o fim, inclusive', () => {
    const regra = { ...ALUGUEL, fim: dataISO('2027-01-05') };
    expect(datasDaRecorrencia(regra, regra.inicio, dataISO('2027-12-31'))).toEqual([
      '2026-11-05',
      '2026-12-05',
      '2027-01-05',
    ]);
  });

  it('começa em `de` quando ele é depois do início', () => {
    expect(datasDaRecorrencia(ALUGUEL, dataISO('2027-03-06'), dataISO('2027-05-31'))).toEqual([
      '2027-04-05',
      '2027-05-05',
    ]);
  });

  it.each([0, 32, 1.5])('recusa dia %s', (dia) => {
    expect(() =>
      datasDaRecorrencia({ ...ALUGUEL, dia }, ALUGUEL.inicio, dataISO('2027-12-31')),
    ).toThrow(RangeError);
  });
});

describe('planejarRecorrencia', () => {
  const hoje = dataISO('2026-10-24');
  const ate = dataISO('2027-01-31');

  it('regra nova gera previstos até o horizonte', () => {
    const plano = planejarRecorrencia(ALUGUEL, [], hoje, ate, contador());
    expect(datas(plano.criar)).toEqual(['2026-11-05', '2026-12-05', '2027-01-05']);
    expect(plano.criar[0]).toEqual({
      id: 'id-0',
      recorrenciaId: 'rec-aluguel',
      data: '2026-11-05',
      status: 'previsto',
      valorCentavos: 250000,
      tipo: 'saida',
      descricao: 'Aluguel',
    });
    expect(plano.atualizar).toEqual([]);
    expect(plano.excluir).toEqual([]);
  });

  it('rodar de novo sem mudança não faz nada (idempotente)', () => {
    const linhas = [
      existente('a', '2026-11-05'),
      existente('b', '2026-12-05'),
      existente('c', '2027-01-05'),
    ];
    expect(planejarRecorrencia(ALUGUEL, linhas, hoje, ate, contador())).toEqual({
      criar: [],
      atualizar: [],
      excluir: [],
    });
  });

  it('aluguel sobe: atualiza só os previstos futuros, mantendo o id', () => {
    const regra = { ...ALUGUEL, valorCentavos: centavos(270000) };
    const linhas = [
      existente('out', '2026-10-05', { status: 'confirmado' }),
      existente('nov', '2026-11-05'),
      existente('dez', '2026-12-05'),
    ];
    const plano = planejarRecorrencia(regra, linhas, dataISO('2026-11-10'), ate, contador());
    expect(plano.atualizar.map((l) => [l.id, l.data, l.valorCentavos])).toEqual([
      ['dez', '2026-12-05', 270000],
    ]);
    expect(datas(plano.criar)).toEqual(['2027-01-05']);
    expect(plano.excluir).toEqual([]);
  });

  it('linha confirmada no mês nunca muda, mesmo no futuro', () => {
    const linhas = [existente('nov', '2026-11-05', { status: 'confirmado', valorCentavos: 1 })];
    const plano = planejarRecorrencia(ALUGUEL, linhas, hoje, dataISO('2026-11-30'), contador());
    expect(plano).toEqual({ criar: [], atualizar: [], excluir: [] });
  });

  it('previsto vencido (a confirmar) não muda nem ganha outro no mesmo mês', () => {
    const regra = { ...ALUGUEL, dia: 28 };
    const linhas = [existente('nov', '2026-11-05')];
    const plano = planejarRecorrencia(
      regra,
      linhas,
      dataISO('2026-11-10'),
      dataISO('2026-11-30'),
      contador(),
    );
    expect(plano).toEqual({ criar: [], atualizar: [], excluir: [] });
  });

  it('mudar o dia move o previsto futuro dentro do mês', () => {
    const regra = { ...ALUGUEL, dia: 10 };
    const plano = planejarRecorrencia(
      regra,
      [existente('nov', '2026-11-05')],
      hoje,
      dataISO('2026-11-30'),
      contador(),
    );
    expect(plano.atualizar.map((l) => [l.id, l.data])).toEqual([['nov', '2026-11-10']]);
  });

  it('mês cuja ocorrência já passou mantém o previsto futuro que existe nele', () => {
    const regra = { ...ALUGUEL, dia: 1 };
    const linhas = [existente('nov', '2026-11-20')];
    const plano = planejarRecorrencia(
      regra,
      linhas,
      dataISO('2026-11-10'),
      dataISO('2026-11-30'),
      contador(),
    );
    expect(plano).toEqual({ criar: [], atualizar: [], excluir: [] });
  });

  it('fim antecipado exclui os previstos futuros depois dele', () => {
    const regra = { ...ALUGUEL, fim: dataISO('2026-11-30') };
    const linhas = [existente('nov', '2026-11-05'), existente('dez', '2026-12-05')];
    const plano = planejarRecorrencia(regra, linhas, hoje, ate, contador());
    expect(plano.excluir).toEqual(['dez']);
    expect(plano.criar).toEqual([]);
  });

  it('regra inativa exclui todos os previstos futuros, e só eles', () => {
    const regra = { ...ALUGUEL, ativo: false };
    const linhas = [
      existente('set', '2026-09-05'),
      existente('out', '2026-10-05', { status: 'confirmado' }),
      existente('nov', '2026-11-05'),
      existente('dez', '2026-12-05'),
    ];
    const plano = planejarRecorrencia(regra, linhas, hoje, ate, contador());
    expect(plano.excluir).toEqual(['nov', 'dez']);
    expect(plano.criar).toEqual([]);
  });

  it('previsto repetido no mesmo mês é excluído, ficando o primeiro', () => {
    const linhas = [existente('nov-b', '2026-11-20'), existente('nov-a', '2026-11-05')];
    const plano = planejarRecorrencia(ALUGUEL, linhas, hoje, dataISO('2026-11-30'), contador());
    expect(plano.atualizar).toEqual([]);
    expect(plano.excluir).toEqual(['nov-b']);
  });

  it('ocorrência de hoje conta como daqui para a frente', () => {
    const plano = planejarRecorrencia(
      ALUGUEL,
      [],
      dataISO('2026-11-05'),
      dataISO('2026-11-30'),
      contador(),
    );
    expect(datas(plano.criar)).toEqual(['2026-11-05']);
  });
});
