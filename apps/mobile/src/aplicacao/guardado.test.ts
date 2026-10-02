import { dataISO } from '@termometro/dominio';
import { describe, expect, it } from 'vitest';
import { linhaNova, opLancar, salvo } from './dados.fixture.ts';
import { aplicarMudanca, NADA_GUARDADO } from './guardado.ts';

describe('aplicarMudanca', () => {
  it('substitui o intervalo do espelho: a planilha sempre vence', () => {
    const dentro = salvo({ id: 'dentro-0001', data: '2026-11-05' });
    const fora = salvo({ id: 'fora-000001', data: '2026-12-20' });
    const novo = salvo({ id: 'novo-000001', data: '2026-11-06' });
    const guardado = { ...NADA_GUARDADO, espelho: [dentro, fora] };

    const depois = aplicarMudanca(guardado, {
      espelho: {
        substituir: { de: dataISO('2026-11-01'), ate: dataISO('2026-11-30') },
        gravar: [novo],
      },
    });

    expect(depois.espelho.map((l) => l.id)).toEqual(['fora-000001', 'novo-000001']);
  });

  it('gravar troca a linha de mesmo id e remover apaga', () => {
    const a = salvo({ id: 'a-00000001' });
    const b = salvo({ id: 'b-00000001' });
    const guardado = { ...NADA_GUARDADO, espelho: [a, b] };
    const aEditado = { ...a, valorCentavos: 950 } as typeof a;

    const depois = aplicarMudanca(guardado, {
      espelho: { gravar: [aEditado], remover: ['b-00000001'] },
    });

    expect(depois.espelho).toEqual([aEditado]);
  });

  it('a fila fica sempre na ordem de seq', () => {
    const guardado = { ...NADA_GUARDADO, fila: [opLancar(2, [linhaNova()])] };

    const depois = aplicarMudanca(guardado, { fila: { gravar: [opLancar(1, [linhaNova()])] } });
    const semA2 = aplicarMudanca(depois, { fila: { remover: ['op-2'] } });

    expect(depois.fila.map((o) => o.seq)).toEqual([1, 2]);
    expect(semA2.fila.map((o) => o.seq)).toEqual([1]);
  });

  it('campos ausentes na mudança não mudam', () => {
    const guardado = { ...NADA_GUARDADO, dono: 'Thays', ultimaSincronizacao: 10 };
    expect(aplicarMudanca(guardado, {})).toEqual(guardado);
  });
});
