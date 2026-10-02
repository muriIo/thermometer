import type { RespostaResumo } from '@termometro/contract';
import { dataISO } from '@termometro/dominio';
import { describe, expect, it } from 'vitest';
import { linhaNova, opEditar, opLancar, salvo } from '../aplicacao/dados.fixture.ts';
import {
  aplicarMudanca,
  type Guardado,
  type Mudanca,
  NADA_GUARDADO,
} from '../aplicacao/guardado.ts';
import { ArmazemSqlite } from './armazem-sqlite.ts';
import { bancoNode } from './banco-node.fixture.ts';

const RESUMO = { data: '2026-11-05', saldoDoDiaCentavos: 1 } as RespostaResumo;

const MUDANCAS: Mudanca[] = [
  {
    espelho: {
      gravar: [
        salvo({ id: 'a-00000001', data: '2026-10-30' }),
        salvo({ id: 'b-00000001', data: '2026-11-05' }),
        salvo({ id: 'c-00000001', data: '2026-12-01' }),
      ],
    },
    fila: { gravar: [opLancar(2, [linhaNova({ id: 'n-00000001' })]), opLancar(1, [linhaNova()])] },
    dono: 'Thays',
  },
  {
    espelho: {
      substituir: { de: dataISO('2026-11-01'), ate: dataISO('2026-11-30') },
      remover: ['a-00000001'],
      gravar: [salvo({ id: 'd-00000001', data: '2026-11-10' })],
    },
    fila: {
      remover: ['op-1'],
      gravar: [
        opEditar(3, {
          id: 'd-00000001',
          edicao: { status: 'confirmado' },
          versaoVista: null,
          versaoEsperada: null,
        }),
      ],
    },
    resumo: { resumo: RESUMO, pedidoEm: 7 },
    ultimaSincronizacao: 9,
  },
];

const normalizar = (g: Guardado): Guardado => ({
  ...g,
  espelho: [...g.espelho].sort((x, y) => x.id.localeCompare(y.id)),
});

describe('ArmazemSqlite', () => {
  it('guarda e devolve o mesmo que aplicarMudanca calcula em memória', async () => {
    const banco = await bancoNode();
    const armazem = new ArmazemSqlite(async () => banco);
    let esperado = NADA_GUARDADO;

    for (const mudanca of MUDANCAS) {
      await armazem.aplicar(mudanca);
      esperado = aplicarMudanca(esperado, mudanca);
      expect(normalizar(await armazem.carregar())).toEqual(normalizar(esperado));
    }
    expect((await armazem.carregar()).fila.map((o) => o.opId)).toEqual(['op-2', 'op-3']);
  });

  it('banco novo carrega vazio', async () => {
    const banco = await bancoNode();
    expect(await new ArmazemSqlite(async () => banco).carregar()).toEqual(NADA_GUARDADO);
  });

  it('gravações ao mesmo tempo entram uma depois da outra', async () => {
    const banco = await bancoNode();
    const armazem = new ArmazemSqlite(async () => banco);

    await Promise.all(MUDANCAS.map((m) => armazem.aplicar(m)));

    const esperado = MUDANCAS.reduce(aplicarMudanca, NADA_GUARDADO);
    expect(normalizar(await armazem.carregar())).toEqual(normalizar(esperado));
  });

  it('falha no meio desfaz a mudança inteira, e a seguinte ainda grava', async () => {
    const banco = await bancoNode();
    const armazem = new ArmazemSqlite(async () => banco);
    const quebrada = opLancar(9, [linhaNova({ valorCentavos: 10n as unknown as number })]);

    await expect(
      armazem.aplicar({
        espelho: { gravar: [salvo({ id: 'x-00000001' })] },
        fila: { gravar: [quebrada] },
      }),
    ).rejects.toThrow();
    await armazem.aplicar({ dono: 'Murilo' });

    expect(await armazem.carregar()).toEqual({ ...NADA_GUARDADO, dono: 'Murilo' });
  });
});
