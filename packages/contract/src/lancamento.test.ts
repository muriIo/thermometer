import { centavos, dataISO, type Lancamento } from '@termometro/dominio';
import { describe, expect, it } from 'vitest';
import type { LinhaNova } from './acoes';
import { aplicarEdicao, lancamentoDaLinhaNova } from './lancamento';

const LINHA: LinhaNova = {
  id: 'linha-0001',
  data: '2026-11-05',
  valorCentavos: 800,
  tipo: 'diario',
  quem: 'Thays',
  meio: 'avista',
  status: 'confirmado',
};

const SALGADO: Lancamento = {
  id: 'linha-0001',
  data: dataISO('2026-11-05'),
  valorCentavos: centavos(800),
  tipo: 'diario',
  estorna: '',
  categoria: '',
  descricao: '',
  quem: 'Thays',
  meio: 'avista',
  cartao: '',
  status: 'confirmado',
  grupoId: '',
  parcelaN: null,
  parcelas: null,
  recorrenciaId: '',
  excluido: false,
};

describe('lancamentoDaLinhaNova', () => {
  it('preenche os opcionais ausentes como a célula vazia', () => {
    expect(lancamentoDaLinhaNova(LINHA)).toEqual(SALGADO);
  });

  it('mantém o parcelamento', () => {
    const parcela = lancamentoDaLinhaNova({
      ...LINHA,
      grupoId: 'g-000001',
      parcelaN: 2,
      parcelas: 3,
    });
    expect(parcela).toMatchObject({ grupoId: 'g-000001', parcelaN: 2, parcelas: 3 });
  });
});

describe('aplicarEdicao', () => {
  it('campos ausentes não mudam', () => {
    expect(aplicarEdicao(SALGADO, {})).toEqual(SALGADO);
  });

  it('confirma um previsto ajustando valor e data', () => {
    const previsto = { ...SALGADO, status: 'previsto' as const };
    const editado = aplicarEdicao(previsto, {
      status: 'confirmado',
      valorCentavos: 950,
      data: '2026-11-06',
    });
    expect(editado).toEqual({
      ...SALGADO,
      valorCentavos: 950,
      data: '2026-11-06',
      status: 'confirmado',
    });
  });

  it('estorna vazio remove o campo', () => {
    const estorno = { ...SALGADO, tipo: 'estorno' as const, estorna: 'diario' as const };
    expect(aplicarEdicao(estorno, { tipo: 'diario', estorna: '' })).toEqual(SALGADO);
  });
});
