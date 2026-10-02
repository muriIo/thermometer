import { describe, expect, it } from 'vitest';
import { centavos } from './centavos';
import { consumoDoDiario } from './consumo';
import { dataISO } from './datas';
import type { Lancamento } from './lancamento';
import { SALGADO } from './lancamento.fixture';

const DIA = dataISO('2026-11-05');
const l = (campos: Partial<Lancamento>): Lancamento => ({ ...SALGADO, ...campos });

describe('consumoDoDiario', () => {
  it('soma o Diário à vista e no cartão do dia, menos estornos do Diário', () => {
    const lancamentos = [
      l({ valorCentavos: centavos(800) }),
      l({ valorCentavos: centavos(1500), meio: 'cartao', cartao: 'INTER' }),
      l({ tipo: 'estorno', estorna: 'diario', valorCentavos: centavos(300) }),
      l({ tipo: 'saida', valorCentavos: centavos(99999) }),
      l({ tipo: 'estorno', estorna: 'saida', valorCentavos: centavos(77) }),
      l({ data: dataISO('2026-11-06'), valorCentavos: centavos(4000) }),
      l({ excluido: true, valorCentavos: centavos(5000) }),
    ];
    expect(consumoDoDiario(lancamentos, DIA)).toBe(2000);
  });

  it('parcelado conta o total no dia da compra, inclusive à vista', () => {
    const grupo = (parcelaN: number, data: string, valor: number) =>
      l({
        grupoId: 'g',
        parcelaN,
        parcelas: 3,
        data: dataISO(data),
        valorCentavos: centavos(valor),
      });
    const lancamentos = [
      grupo(1, '2026-11-05', 3334),
      grupo(2, '2026-12-05', 3333),
      grupo(3, '2027-01-05', 3333),
    ];
    expect(consumoDoDiario(lancamentos, DIA)).toBe(10000);
    expect(consumoDoDiario(lancamentos, dataISO('2026-12-05'))).toBe(0);
  });
});
