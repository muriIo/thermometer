import type { RespostaResumo } from '@termometro/contract';
import { dataISO } from '@termometro/dominio';
import { describe, expect, it } from 'vitest';
import { HOJE, linhaNova, opEditar, opLancar, salvo } from './dados.fixture.ts';
import { type Estado, estadoInicial } from './estado.ts';
import { painelDeHoje } from './painel.ts';

const RESUMO: RespostaResumo = {
  data: HOJE,
  saldoDoDiaCentavos: 100_000,
  menorSaldoDoMes: { data: '2026-11-20', saldoCentavos: 20_000 },
  diarioCaixaCentavos: 1500,
  consumoDoDiarioCentavos: 1500,
  previsaoCentavos: 5000,
  totaisDoMes: { entrada: 0, saida: 0, diario: 0, estorno: 0 },
  gastosPorCategoria: [],
  celulasSemFormula: 0,
};

const estado = (campos: Partial<Estado>): Estado => ({
  ...estadoInicial(HOJE),
  fase: 'pronto',
  online: true,
  resumo: { resumo: RESUMO, pedidoEm: 0 },
  ...campos,
});

describe('painelDeHoje', () => {
  it('online e sem pendentes, mostra o que a planilha leu, sem estimar', () => {
    const painel = painelDeHoje(estado({}));
    expect(painel).toMatchObject({
      consumoCentavos: 1500,
      previsaoCentavos: 5000,
      passouDaPrevisao: false,
      saldo: { centavos: 100_000, estimado: false },
      menorSaldoDoMes: RESUMO.menorSaldoDoMes,
      pendentes: 0,
    });
  });

  it('lançamento pendente entra no consumo e no saldo, que vira estimado', () => {
    const fila = [opLancar(1, [linhaNova({ id: 'n-00000001', valorCentavos: 4000 })])];

    const painel = painelDeHoje(estado({ fila, online: false }));

    expect(painel.consumoCentavos).toBe(5500);
    expect(painel.passouDaPrevisao).toBe(true);
    expect(painel.saldo).toEqual({ centavos: 96_000, estimado: true });
    expect(painel.pendentes).toBe(1);
    expect(painel.deHoje.map((l) => [l.id, l.situacao])).toEqual([['n-00000001', 'pendente']]);
  });

  it('compra no cartão pendente entra no consumo mas não no saldo do dia', () => {
    const fila = [
      opLancar(1, [
        linhaNova({ id: 'n-00000001', valorCentavos: 4000, meio: 'cartao', cartao: 'INTER' }),
      ]),
    ];
    const painel = painelDeHoje(estado({ fila }));
    expect(painel.consumoCentavos).toBe(5500);
    expect(painel.saldo?.centavos).toBe(100_000);
  });

  it('confirmar um previsto com outro valor estima só a diferença', () => {
    const previsto = salvo({
      id: 'p-00000001',
      tipo: 'saida',
      valorCentavos: 10_000,
      status: 'previsto',
    });
    const fila = [
      opEditar(1, {
        id: 'p-00000001',
        edicao: { status: 'confirmado', valorCentavos: 12_000 },
        versaoVista: previsto.versao,
        versaoEsperada: 'x',
      }),
    ];
    expect(painelDeHoje(estado({ espelho: [previsto], fila })).saldo?.centavos).toBe(98_000);
  });

  it('o que foi concluído depois do resumo continua somando até o próximo resumo', () => {
    const ajustesDesdeResumo = [{ caixaCentavos: -800, consumoCentavos: 800, concluidoEm: 5 }];
    const painel = painelDeHoje(estado({ ajustesDesdeResumo }));
    expect(painel.consumoCentavos).toBe(2300);
    expect(painel.saldo).toEqual({ centavos: 99_200, estimado: true });
  });

  it('resumo de ontem: soma o caixa do espelho até hoje e estima', () => {
    const ontem = { ...RESUMO, data: '2026-11-04', consumoDoDiarioCentavos: 999 };
    const espelho = [
      salvo({ id: 'e-00000001', tipo: 'entrada', valorCentavos: 50_000 }),
      salvo({ id: 'v-00000001', data: '2026-11-04', valorCentavos: 7777 }),
      salvo({ id: 'd-00000001', valorCentavos: 300 }),
    ];

    const painel = painelDeHoje(estado({ espelho, resumo: { resumo: ontem, pedidoEm: 0 } }));

    expect(painel.saldo).toEqual({ centavos: 149_700, estimado: true });
    expect(painel.consumoCentavos).toBe(300);
  });

  it('sem resumo do mês, a previsão vem das referências e não há menor saldo', () => {
    const doMesPassado = { ...RESUMO, data: '2026-10-31' };
    const painel = painelDeHoje(
      estado({
        resumo: { resumo: doMesPassado, pedidoEm: 0 },
        referencias: {
          categorias: { gasto: [], receita: [] },
          cartoes: [],
          previsao: { mes: '2026-11', diarioPorDiaCentavos: 4200 },
          limites: { valorMaximoCentavos: 1, confirmarAcimaDiarioCentavos: 1 },
        },
      }),
    );
    expect(painel.previsaoCentavos).toBe(4200);
    expect(painel.menorSaldoDoMes).toBeNull();
  });

  it('nunca recebeu resumo: sem saldo, consumo pelo espelho', () => {
    const espelho = [salvo({ id: 'd-00000001', valorCentavos: 300 })];
    const painel = painelDeHoje(estado({ resumo: null, espelho }));
    expect(painel.saldo).toBeNull();
    expect(painel.consumoCentavos).toBe(300);
    expect(painel.previsaoCentavos).toBeNull();
  });

  it('a confirmar: previstos de hoje e vencidos; de hoje: só confirmados', () => {
    const espelho = [
      salvo({ id: 'v-00000001', data: '2026-11-02', status: 'previsto' }),
      salvo({ id: 'h-00000001', status: 'previsto' }),
      salvo({ id: 'c-00000001' }),
      salvo({ id: 'f-00000001', data: dataISO('2026-11-07'), status: 'previsto' }),
    ];
    const painel = painelDeHoje(estado({ espelho }));
    expect(painel.aConfirmar.map((l) => l.id)).toEqual(['v-00000001', 'h-00000001']);
    expect(painel.deHoje.map((l) => l.id)).toEqual(['c-00000001']);
  });
});
