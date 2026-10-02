import { describe, expect, it } from 'vitest';
import { centavos } from './centavos';
import { dataISO } from './datas';
import type { Lancamento } from './lancamento';
import { SALGADO } from './lancamento.fixture';
import { versao } from './versao';

describe('versao', () => {
  it('é estável para o mesmo conteúdo e tem 14 dígitos hex', () => {
    expect(versao(SALGADO)).toBe(versao({ ...SALGADO }));
    expect(versao(SALGADO)).toMatch(/^[0-9a-f]{14}$/);
  });

  it('muda com qualquer campo de negócio, inclusive excluir', () => {
    const base = versao(SALGADO);
    const variacoes: Partial<Lancamento>[] = [
      { valorCentavos: centavos(801) },
      { data: dataISO('2026-11-06') },
      { descricao: 'Salgado ' },
      { status: 'previsto' },
      { quem: 'Murilo' },
      { excluido: true },
      { parcelaN: 1 },
    ];
    for (const variacao of variacoes) {
      expect(versao({ ...SALGADO, ...variacao }), JSON.stringify(variacao)).not.toBe(base);
    }
  });

  it('ignora o id, que não muda', () => {
    expect(versao({ ...SALGADO, id: 'b' })).toBe(versao(SALGADO));
  });

  it('não confunde campos vizinhos (separador entre campos)', () => {
    const a = versao({ ...SALGADO, categoria: 'ab', descricao: 'c' });
    const b = versao({ ...SALGADO, categoria: 'a', descricao: 'bc' });
    expect(a).not.toBe(b);
  });
});
