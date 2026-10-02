import { type DataISO, diaDe, diaDoMes, type MesISO, mesDe, somarMesesAoMes } from './datas';

/** O que o ciclo de fatura precisa saber de um cartão (aba `Cartões`). */
export type CicloDoCartao = {
  readonly id: string;
  /** Dia do mês em que a fatura fecha (1–31; dia inexistente = último dia). */
  readonly fechamento: number;
  /** Dia do mês em que a fatura vence (1–31; dia inexistente = último dia). */
  readonly vencimento: number;
};

/** Uma linha da aba `Faturas`, sem as colunas calculadas e sem `pago_em`. */
export type Fatura = {
  /** `<cartao>-<AAAA-MM>`, com o mês em que a fatura fecha. */
  readonly id: string;
  readonly cartao: string;
  readonly fechaEm: DataISO;
  readonly venceEm: DataISO;
};

/**
 * Mês em que fecha a fatura de uma compra (ou da parcela `parcelaN` dela).
 * Compra no dia do fechamento ou depois cai na fatura seguinte (ADR 0004);
 * a parcela k cai na k-ésima fatura a partir da compra (PROJECT.md, 5.5).
 */
export function mesDaFatura(cartao: CicloDoCartao, dataCompra: DataISO, parcelaN = 1): MesISO {
  const mes = mesDe(dataCompra);
  const fechaNoMes = diaDe(diaDoMes(mes, cartao.fechamento));
  const depoisDoFechamento = diaDe(dataCompra) >= fechaNoMes ? 1 : 0;
  return somarMesesAoMes(mes, depoisDoFechamento + parcelaN - 1);
}

export function faturaId(cartao: string, mes: MesISO): string {
  return `${cartao}-${mes}`;
}

/**
 * O ciclo que fecha em `mes`. Se o vencimento não for depois do fechamento
 * no calendário (Inter: fecha 24, vence 1), ela vence no mês seguinte.
 */
export function fatura(cartao: CicloDoCartao, mes: MesISO): Fatura {
  const venceNoMesSeguinte = cartao.vencimento <= cartao.fechamento;
  return {
    id: faturaId(cartao.id, mes),
    cartao: cartao.id,
    fechaEm: diaDoMes(mes, cartao.fechamento),
    venceEm: diaDoMes(somarMesesAoMes(mes, venceNoMesSeguinte ? 1 : 0), cartao.vencimento),
  };
}

/** Faturas que fecham de `de` até `ate`, inclusive, em ordem (menu "gerar faturas"). */
export function faturasEntre(cartao: CicloDoCartao, de: MesISO, ate: MesISO): Fatura[] {
  const faturas: Fatura[] = [];
  for (let mes = de; mes <= ate; mes = somarMesesAoMes(mes, 1)) {
    faturas.push(fatura(cartao, mes));
  }
  return faturas;
}
