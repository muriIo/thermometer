import { describe, expect, it } from 'vitest';
import { aConfirmar } from './a-confirmar';
import { dataISO } from './datas';
import type { Lancamento } from './lancamento';
import { SALGADO } from './lancamento.fixture';

const HOJE = dataISO('2026-11-05');
const l = (campos: Partial<Lancamento>): Lancamento => ({ ...SALGADO, ...campos });

describe('aConfirmar', () => {
  it('previstos de hoje e vencidos, do mais antigo para o mais novo', () => {
    const vencido = l({ id: 'v', status: 'previsto', data: dataISO('2026-11-01') });
    const deHoje = l({ id: 'h', status: 'previsto', data: HOJE });
    const futuro = l({ id: 'f', status: 'previsto', data: dataISO('2026-11-06') });
    const confirmado = l({ id: 'c', data: dataISO('2026-11-02') });
    const excluido = l({ id: 'x', status: 'previsto', data: HOJE, excluido: true });

    const ids = aConfirmar([deHoje, futuro, confirmado, excluido, vencido], HOJE).map((p) => p.id);

    expect(ids).toEqual(['v', 'h']);
  });
});
