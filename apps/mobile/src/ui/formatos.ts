/** Textos da UI: datas em português e o teclado de valor da tela Lançar. */
import type { DataISO } from '@termometro/dominio';

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/** "Quinta, 1 de outubro". Sem Intl: o Hermes não traz todos os locales. */
export function dataPorExtenso(data: DataISO): string {
  const [ano, mes, dia] = partes(data);
  const semana = DIAS[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()];
  return `${semana}, ${dia} de ${MESES[mes - 1]}`;
}

/** "1/out". */
export function dataCurta(data: DataISO): string {
  const [, mes, dia] = partes(data);
  return `${dia}/${MESES[mes - 1]?.slice(0, 3)}`;
}

function partes(data: DataISO): [number, number, number] {
  return [Number(data.slice(0, 4)), Number(data.slice(5, 7)), Number(data.slice(8, 10))];
}

const MAXIMO_DIGITOS = 9;

/**
 * Aplica uma tecla (`0`–`9`, `,` ou `<` para apagar) ao texto do valor,
 * em reais com vírgula decimal e no máximo dois decimais.
 */
export function teclar(texto: string, tecla: string): string {
  if (tecla === '<') return texto.slice(0, -1).replace(/^0$/, '');
  if (tecla === ',') return texto.includes(',') ? texto : `${texto || '0'},`;
  const [inteiro = '', decimal] = texto.split(',');
  if (decimal !== undefined) return decimal.length >= 2 ? texto : texto + tecla;
  if (inteiro.length >= MAXIMO_DIGITOS) return texto;
  return inteiro === '0' || inteiro === '' ? tecla.replace(/^0$/, '') : texto + tecla;
}

export function centavosDoTeclado(texto: string): number {
  const [inteiro = '', decimal = ''] = texto.split(',');
  return Number(inteiro || 0) * 100 + Number(decimal.padEnd(2, '0'));
}

/** Centavos no formato do teclado, para começar um campo já preenchido: 152050 → "1520,5". */
export function textoDoValor(centavos: number): string {
  const inteiro = Math.floor(centavos / 100);
  const resto = centavos % 100;
  if (resto === 0) return String(inteiro);
  return `${inteiro},${String(resto).padStart(2, '0').replace(/0$/, '')}`;
}

/** Texto digitado no teclado do sistema, filtrado pelas mesmas regras do teclado próprio. */
export function filtrarValor(digitado: string): string {
  return [...digitado.replace('.', ',')].filter((c) => /[0-9,]/.test(c)).reduce(teclar, '');
}
