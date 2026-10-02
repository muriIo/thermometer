import { describe, expect, it } from 'vitest';
import { centavos } from './centavos';
import { dataISO } from './datas';
import type { Lancamento } from './lancamento';
import { SALGADO } from './lancamento.fixture';
import { previstoParecido } from './sugestao';

const ALUGUEL: Lancamento = {
  ...SALGADO,
  id: 'aluguel',
  tipo: 'saida',
  descricao: 'Aluguel',
  categoria: 'Casa',
  valorCentavos: centavos(250_000),
  data: dataISO('2026-11-05'),
  status: 'previsto',
};

const novo = {
  tipo: 'saida' as const,
  descricao: 'aluguel ',
  valorCentavos: centavos(255_000),
  data: dataISO('2026-11-03'),
};

describe('previstoParecido', () => {
  it('acha o previsto do mesmo tipo e descrição a até 3 dias, mesmo com outro valor', () => {
    expect(previstoParecido([ALUGUEL], novo)?.id).toBe('aluguel');
  });

  it('sem descrição, o mesmo valor também serve', () => {
    const semDescricao = { ...novo, descricao: '', valorCentavos: centavos(250_000) };
    expect(previstoParecido([ALUGUEL], semDescricao)?.id).toBe('aluguel');
  });

  it.each<[string, Partial<Lancamento>]>([
    ['confirmado', { status: 'confirmado' }],
    ['excluído', { excluido: true }],
    ['de outro tipo', { tipo: 'diario' }],
    ['a mais de 3 dias', { data: dataISO('2026-11-07') }],
    ['nem descrição nem valor batem', { descricao: 'Condomínio' }],
  ])('ignora previsto %s', (_, campos) => {
    expect(previstoParecido([{ ...ALUGUEL, ...campos }], novo)).toBeNull();
  });

  it('entre vários, prefere quem bate a descrição e depois o mais perto', () => {
    const peloValor = {
      ...ALUGUEL,
      id: 'valor',
      descricao: 'Outro',
      valorCentavos: novo.valorCentavos,
      data: novo.data,
    };
    const longe = { ...ALUGUEL, id: 'longe', data: dataISO('2026-11-06') };
    expect(previstoParecido([peloValor, longe, ALUGUEL], novo)?.id).toBe('aluguel');
  });
});
