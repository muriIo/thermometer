/**
 * Datas são strings `YYYY-MM-DD` em todo o código, nunca `Date` com horário
 * (PROJECT.md, seção 5.6). A aritmética aqui é só de calendário, sem fuso.
 */
export type DataISO = string & { readonly __marca: 'DataISO' };

/** Um mês do calendário, `YYYY-MM`. Identifica blocos, previsões e faturas. */
export type MesISO = string & { readonly __marca: 'MesISO' };

const FORMATO_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
const FORMATO_MES = /^(\d{4})-(\d{2})$/;

export function dataISO(texto: string): DataISO {
  const partes = FORMATO_DATA.exec(texto);
  const ano = Number(partes?.[1]);
  const mes = Number(partes?.[2]);
  const dia = Number(partes?.[3]);
  if (!partes || mes < 1 || mes > 12 || dia < 1 || dia > diasNoMes(ano, mes)) {
    throw new RangeError(`Data inválida, esperado YYYY-MM-DD: ${texto}`);
  }
  return texto as DataISO;
}

export function mesISO(texto: string): MesISO {
  const partes = FORMATO_MES.exec(texto);
  const mes = Number(partes?.[2]);
  if (!partes || mes < 1 || mes > 12) {
    throw new RangeError(`Mês inválido, esperado YYYY-MM: ${texto}`);
  }
  return texto as MesISO;
}

export function diasNoMes(ano: number, mes: number): number {
  if (mes === 2) return ehBissexto(ano) ? 29 : 28;
  return [4, 6, 9, 11].includes(mes) ? 30 : 31;
}

function ehBissexto(ano: number): boolean {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

/**
 * O dia `dia` de um mês. Dia que não existe no mês vira o último dia do mês
 * (regra de recorrências, parcelas à vista e fechamento de fatura).
 */
export function diaDoMes(mes: MesISO, dia: number): DataISO {
  const [ano, numero] = anoEMes(mes);
  const limitado = Math.min(dia, diasNoMes(ano, numero));
  return `${mes}-${dois(limitado)}` as DataISO;
}

export function mesDe(data: DataISO): MesISO {
  return data.slice(0, 7) as MesISO;
}

export function diaDe(data: DataISO): number {
  return Number(data.slice(8, 10));
}

export function somarMesesAoMes(mes: MesISO, meses: number): MesISO {
  const [ano, numero] = anoEMes(mes);
  const indice = ano * 12 + (numero - 1) + meses;
  const novoAno = Math.floor(indice / 12);
  const novoMes = indice - novoAno * 12 + 1;
  return `${novoAno.toString().padStart(4, '0')}-${dois(novoMes)}` as MesISO;
}

/** Mesmo dia, `meses` depois. 31/01 + 1 mês = 28/02 (ou 29 em ano bissexto). */
export function somarMeses(data: DataISO, meses: number): DataISO {
  return diaDoMes(somarMesesAoMes(mesDe(data), meses), diaDe(data));
}

function anoEMes(mes: MesISO): [number, number] {
  return [Number(mes.slice(0, 4)), Number(mes.slice(5, 7))];
}

function dois(numero: number): string {
  return numero.toString().padStart(2, '0');
}
