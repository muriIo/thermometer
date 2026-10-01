// I/O com SpreadsheetApp. Fino de propósito: decisões ficam nos módulos testados.
import { DEFINICOES, definicao, type NomeAba } from './esquema';
import type { Letras } from './formulas';
import {
  lerTabela,
  letraDaColuna,
  segmentosGravaveis,
  type Tabela,
  valoresDoSegmento,
} from './tabela';

type Aba = GoogleAppsScript.Spreadsheet.Sheet;

/** Marca as proteções criadas pelo script, para recriá-las sem duplicar. */
const DESCRICAO_PROTECAO = 'Termômetro: célula calculada';

export function planilha(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  return SpreadsheetApp.getActiveSpreadsheet();
}

export function aba(nome: string): Aba | null {
  return planilha().getSheetByName(nome);
}

export function abaObrigatoria(nome: string): Aba {
  const encontrada = aba(nome);
  if (!encontrada) throw new Error(`Aba "${nome}" não existe. Rode "Preparar abas" antes.`);
  return encontrada;
}

export function cabecalho(nome: string): string[] | null {
  const encontrada = aba(nome);
  if (!encontrada) return null;
  const colunas = encontrada.getLastColumn();
  if (colunas === 0) return [];
  return (
    encontrada
      .getRange(1, 1, 1, colunas)
      .getValues()[0]
      ?.map((celula) => String(celula).trim()) ?? []
  );
}

export type Lida = { readonly tabela: Tabela; readonly valores: unknown[][] };

export function ler(nome: NomeAba): Lida {
  const valores = abaObrigatoria(nome).getDataRange().getValues();
  return { tabela: lerTabela(valores), valores };
}

export function letrasAtuais(): Letras {
  const cache = new Map<string, string[]>();
  return (nome, coluna) => {
    const colunas = cache.get(nome) ?? cabecalho(nome) ?? [];
    cache.set(nome, colunas);
    const indice = colunas.indexOf(coluna);
    if (indice < 0) throw new Error(`Coluna "${coluna}" não encontrada na aba "${nome}".`);
    return letraDaColuna(indice);
  };
}

/** Acrescenta registros no fim, escrevendo só fora das colunas ƒ. */
export function acrescentar(nome: NomeAba, registros: readonly Record<string, unknown>[]): void {
  if (registros.length === 0) return;
  const destino = abaObrigatoria(nome);
  const colunas = cabecalho(nome) ?? [];
  const primeira = ultimaLinhaComDados(destino, colunas, definicao(nome).calculadas) + 1;
  for (const segmento of segmentosGravaveis(colunas, definicao(nome).calculadas)) {
    const valores = registros.map((registro) => valoresDoSegmento(colunas, segmento, registro));
    destino
      .getRange(primeira, segmento.inicio + 1, registros.length, segmento.fim - segmento.inicio)
      .setValues(valores);
  }
}

/** Atualiza campos de uma linha já lida, sem tocar nas colunas ƒ. */
export function atualizar(
  nome: NomeAba,
  lida: Lida,
  linha: number,
  campos: Readonly<Record<string, unknown>>,
): void {
  const destino = abaObrigatoria(nome);
  const colunas = lida.tabela.cabecalho;
  const atual = lida.valores[linha - 1] ?? [];
  for (const segmento of segmentosGravaveis(colunas, definicao(nome).calculadas)) {
    const nomes = colunas.slice(segmento.inicio, segmento.fim);
    if (!nomes.some((coluna) => coluna in campos)) continue;
    destino
      .getRange(linha, segmento.inicio + 1, 1, segmento.fim - segmento.inicio)
      .setValues([valoresDoSegmento(colunas, segmento, campos, atual)]);
  }
}

/**
 * `getLastRow()` conta as linhas preenchidas pelas `ARRAYFORMULA`; a última
 * linha de verdade é a última com algo numa coluna gravável.
 */
function ultimaLinhaComDados(
  destino: Aba,
  colunas: string[],
  calculadas: readonly string[],
): number {
  const valores = destino.getDataRange().getValues();
  for (let linha = valores.length; linha > 1; linha--) {
    const celulas = valores[linha - 1] ?? [];
    if (colunas.some((nome, i) => !calculadas.includes(nome) && celulas[i] !== '')) return linha;
  }
  return 1;
}

/**
 * Cria a aba com cabeçalho, formatos e linhas iniciais. O nome das colunas ƒ
 * fica como texto até `prepararAbas` gravar a fórmula, que também o produz.
 */
export function criarAba(nome: NomeAba): void {
  const def = definicao(nome);
  const nova = planilha().insertSheet(nome);
  nova
    .getRange(1, 1, 1, def.colunas.length)
    .setValues([[...def.colunas]])
    .setFontWeight('bold');
  nova.setFrozenRows(1);
  formatar(nova, def.colunas, def.texto, '@');
  formatar(nova, def.colunas, def.datas, 'dd/mm/yyyy');
  if (def.linhasIniciais.length > 0) {
    nova
      .getRange(2, 1, def.linhasIniciais.length, def.colunas.length)
      .setValues(def.linhasIniciais.map((linha) => [...linha]));
  }
}

export function acrescentarColunas(nome: NomeAba, novas: readonly string[]): void {
  const destino = abaObrigatoria(nome);
  const def = definicao(nome);
  const inicio = destino.getLastColumn() + 1;
  destino
    .getRange(1, inicio, 1, novas.length)
    .setValues([[...novas]])
    .setFontWeight('bold');
  formatar(
    destino,
    cabecalho(nome) ?? [],
    def.texto.filter((c) => novas.includes(c)),
    '@',
  );
  formatar(
    destino,
    cabecalho(nome) ?? [],
    def.datas.filter((c) => novas.includes(c)),
    'dd/mm/yyyy',
  );
}

function formatar(
  destino: Aba,
  colunas: readonly string[],
  alvo: readonly string[],
  formato: string,
) {
  for (const coluna of alvo) {
    const indice = colunas.indexOf(coluna);
    if (indice >= 0)
      destino.getRange(2, indice + 1, destino.getMaxRows() - 1, 1).setNumberFormat(formato);
  }
}

/** Remove as proteções que o script criou antes, para reaplicar sem duplicar. */
export function removerProtecoes(destino: Aba): void {
  for (const protecao of destino.getProtections(SpreadsheetApp.ProtectionType.RANGE)) {
    if (protecao.getDescription() === DESCRICAO_PROTECAO) protecao.remove();
  }
}

export function proteger(intervalo: GoogleAppsScript.Spreadsheet.Range): void {
  intervalo.protect().setDescription(DESCRICAO_PROTECAO).setWarningOnly(true);
}

export const TODAS_AS_ABAS: readonly NomeAba[] = DEFINICOES.map((def) => def.nome);
