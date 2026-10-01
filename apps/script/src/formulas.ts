/**
 * Fórmulas da planilha, montadas por código e nunca copiadas à mão
 * (docs/engenharia.md, 3). Sintaxe en-US, que é a que `setFormula` aceita
 * em qualquer localidade: nomes em inglês, `,` entre argumentos.
 */
import { type DataISO, diaDoMes, mesDe, mesISO } from '@termometro/dominio';
import { ABAS, type NomeAba } from './esquema';

/** Letra da coluna `coluna` na aba `aba`, pelo cabeçalho atual. */
export type Letras = (aba: NomeAba, coluna: string) => string;

const NAO_EXCLUIDO = '"<>TRUE"';

function inteira(letras: Letras, aba: NomeAba, coluna: string): string {
  const letra = letras(aba, coluna);
  return `'${aba}'!${letra}:${letra}`;
}

function corpo(letras: Letras, aba: NomeAba, coluna: string): string {
  const letra = letras(aba, coluna);
  return `'${aba}'!${letra}2:${letra}`;
}

function cabecalho(nome: string, expressao: string): string {
  return `={"${nome}";${expressao}}`;
}

/**
 * ƒ `fatura_id`: espelha `mesDaFatura` do domínio. Compra no dia do
 * fechamento ou depois cai na fatura seguinte; a parcela k, na k-ésima;
 * fechamento em dia inexistente vale como o último dia do mês.
 */
function faturaId(letras: Letras): string {
  const L = (coluna: string) => corpo(letras, ABAS.lancamentos, coluna);
  const C = (coluna: string) => corpo(letras, ABAS.cartoes, coluna);
  return cabecalho(
    'fatura_id',
    `ARRAYFORMULA(LET(dt,${L('data')},cartao,${L('cartao')},parcela,${L('parcela_n')},` +
      `fecha,XLOOKUP(cartao,${C('id')},${C('fechamento')},0),ultimo,DAY(EOMONTH(dt,0)),` +
      `mes,EDATE(EOMONTH(dt,-1)+1,(DAY(dt)>=IF(fecha>ultimo,ultimo,fecha))+IF(parcela="",0,parcela-1)),` +
      `IF((${L('meio')}="cartao")*(dt<>"")*(cartao<>""),cartao&"-"&YEAR(mes)&"-"&TEXT(MONTH(mes),"00"),"")))`,
  );
}

/** ƒ `data_caixa`: à vista = `data`; cartão = data efetiva da fatura. */
function dataCaixa(letras: Letras): string {
  const L = (coluna: string) => corpo(letras, ABAS.lancamentos, coluna);
  const F = (coluna: string) => corpo(letras, ABAS.faturas, coluna);
  return cabecalho(
    'data_caixa',
    `ARRAYFORMULA(IF(${L('data')}="","",IF(${L('meio')}="cartao",` +
      `XLOOKUP(${L('fatura_id')},${F('id')},${F('data_efetiva')},""),${L('data')})))`,
  );
}

function dataEfetiva(letras: Letras): string {
  const F = (coluna: string) => corpo(letras, ABAS.faturas, coluna);
  return cabecalho(
    'data_efetiva',
    `ARRAYFORMULA(IF(${F('id')}="","",IF(${F('pago_em')}="",${F('vence_em')},${F('pago_em')})))`,
  );
}

/** ƒ `total`: compras não excluídas da fatura − estornos no cartão. */
function totalFatura(letras: Letras): string {
  const L = (coluna: string) => inteira(letras, ABAS.lancamentos, coluna);
  const soma = (tipo: string) =>
    `SUMIFS(${L('valor')},${L('fatura_id')},id,${L('tipo')},"${tipo}",${L('excluido')},${NAO_EXCLUIDO})`;
  return cabecalho(
    'total',
    `MAP(${corpo(letras, ABAS.faturas, 'id')},LAMBDA(id,IF(id="","",${soma('<>estorno')}-${soma('estorno')})))`,
  );
}

function statusFatura(letras: Letras): string {
  const F = (coluna: string) => corpo(letras, ABAS.faturas, coluna);
  return cabecalho(
    'status',
    `ARRAYFORMULA(IF(${F('id')}="","",IF(${F('pago_em')}<>"","paga",` +
      `IF(TODAY()>=${F('fecha_em')},"fechada","aberta"))))`,
  );
}

const CALCULADAS: Readonly<Record<string, (letras: Letras) => string>> = {
  [`${ABAS.lancamentos}.fatura_id`]: faturaId,
  [`${ABAS.lancamentos}.data_caixa`]: dataCaixa,
  [`${ABAS.faturas}.data_efetiva`]: dataEfetiva,
  [`${ABAS.faturas}.total`]: totalFatura,
  [`${ABAS.faturas}.status`]: statusFatura,
};

/** Fórmula do cabeçalho de uma coluna ƒ. */
export function formulaCalculada(aba: NomeAba, coluna: string, letras: Letras): string {
  const montar = CALCULADAS[`${aba}.${coluna}`];
  if (!montar) throw new Error(`Coluna calculada sem fórmula: ${aba}.${coluna}`);
  return montar(letras);
}

export type FormulasDoDia = {
  readonly entrada: string;
  readonly saida: string;
  readonly diario: string;
};

/**
 * Entrada, Saída e Diário de um dia do bloco (PROJECT.md, 5.4). Ignoram
 * excluídos e contam previstos e confirmados. Compras no cartão entram só
 * pela fatura, na Saída da data efetiva (ADR 0004).
 */
export function formulasDoDia(data: DataISO, letras: Letras): FormulasDoDia {
  const L = (coluna: string) => inteira(letras, ABAS.lancamentos, coluna);
  const F = (coluna: string) => inteira(letras, ABAS.faturas, coluna);
  const P = (coluna: string) => inteira(letras, ABAS.previsao, coluna);
  const dia = `DATE(${data.slice(0, 4)},${Number(data.slice(5, 7))},${Number(data.slice(8))})`;
  const soma = (...criterios: [string, string][]) =>
    `SUMIFS(${L('valor')},${L('data_caixa')},${dia},${criterios
      .map(([coluna, valor]) => `${L(coluna)},"${valor}"`)
      .join(',')},${L('excluido')},${NAO_EXCLUIDO})`;

  const diarioAVista = soma(['tipo', 'diario'], ['meio', 'avista']);
  const estornoDiario = soma(['tipo', 'estorno'], ['estorna', 'diario'], ['meio', 'avista']);
  const previsao = `IFERROR(XLOOKUP("${mesDe(data)}",${P('mes')},${P('diario_por_dia')}),0)`;

  return {
    entrada: `=${soma(['tipo', 'entrada'])}`,
    saida:
      `=${soma(['tipo', 'saida'], ['meio', 'avista'])}` +
      `-${soma(['tipo', 'estorno'], ['estorna', 'saida'], ['meio', 'avista'])}` +
      `+SUMIFS(${F('total')},${F('data_efetiva')},${dia})`,
    diario: `=IF(${dia}>TODAY(),${previsao}+${diarioAVista},${diarioAVista}-${estornoDiario})`,
  };
}

/** Posição de um dia nas abas de ano (PROJECT.md, 3.1). Linhas e colunas 1-based. */
export type CelulasDoDia = {
  readonly aba: string;
  readonly mes: number;
  /** Linha do bloco, 1–31 (pode não existir no mês). */
  readonly dia: number;
  readonly linha: number;
  readonly entrada: number;
  readonly saida: number;
  readonly diario: number;
  readonly saldo: number;
};

/** Bloco de 5 colunas por mês, separados por 1 vazia; dias 1–31 nas linhas 3–33. */
export function celulasDoDia(ano: number, mes: number, dia: number): CelulasDoDia {
  const data = (coluna: number) => 1 + (mes - 1) * 6 + coluna;
  return {
    aba: String(ano),
    mes,
    dia,
    linha: 2 + dia,
    entrada: data(1),
    saida: data(2),
    diario: data(3),
    saldo: data(4),
  };
}

export type DiaDoBloco = {
  readonly celulas: CelulasDoDia;
  /** `null` = dia inexistente (31/04, 30/02): a célula fica vazia. */
  readonly data: DataISO | null;
};

/** Todos os dias dos blocos de `ano` a partir de `corte`, inclusive. */
export function diasDoAnoAPartirDe(ano: number, corte: DataISO): DiaDoBloco[] {
  const dias: DiaDoBloco[] = [];
  for (let mes = 1; mes <= 12; mes++) {
    const mesDoAno = mesISO(`${ano}-${mes.toString().padStart(2, '0')}`);
    if (diaDoMes(mesDoAno, 31) < corte) continue;
    for (let dia = 1; dia <= 31; dia++) {
      const data = diaDoMes(mesDoAno, dia);
      const existe = Number(data.slice(8)) === dia;
      if (existe && data < corte) continue;
      dias.push({ celulas: celulasDoDia(ano, mes, dia), data: existe ? data : null });
    }
  }
  return dias;
}
