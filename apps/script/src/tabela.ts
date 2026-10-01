import { type DataISO, dataISO } from '@termometro/dominio';

/** Uma linha lida da planilha, pelo nome do cabeçalho. `linha` é 1-based. */
export type Registro = {
  readonly linha: number;
  readonly dados: Readonly<Record<string, unknown>>;
};

export type Tabela = {
  readonly cabecalho: readonly string[];
  readonly registros: readonly Registro[];
};

/** Lê o resultado de `getValues()` (linha 1 = cabeçalho), pulando linhas vazias. */
export function lerTabela(valores: readonly (readonly unknown[])[]): Tabela {
  const [primeira = [], ...resto] = valores;
  const cabecalho = primeira.map((celula) => String(celula ?? '').trim());
  const registros: Registro[] = [];
  resto.forEach((celulas, i) => {
    if (celulas.every(vazia)) return;
    const dados: Record<string, unknown> = {};
    cabecalho.forEach((nome, coluna) => {
      if (nome) dados[nome] = celulas[coluna];
    });
    registros.push({ linha: i + 2, dados });
  });
  return { cabecalho, registros };
}

const CABECALHO_CALCULADO = /^=\s*\{\s*"([^"]+)"\s*[;\\,]/;

/**
 * Nome de uma coluna pelo valor da célula do cabeçalho. Coluna ƒ cuja fórmula
 * `={"nome";…}` está em erro mostra `#ERROR!`; o nome sai da própria fórmula,
 * para o script não achar que a coluna sumiu (e criar outra).
 */
export function nomeDoCabecalho(valor: unknown, formula: string): string {
  return CABECALHO_CALCULADO.exec(formula)?.[1] ?? String(valor ?? '').trim();
}

/** Faixa contínua de colunas (0-based, `fim` exclusivo) que o script pode escrever. */
export type Segmento = { readonly inicio: number; readonly fim: number };

/**
 * Escrever a linha inteira com `setValues` apagaria as `ARRAYFORMULA` das
 * colunas ƒ (PROJECT.md, 5). Então a escrita é feita só nestas faixas.
 */
export function segmentosGravaveis(
  cabecalho: readonly string[],
  calculadas: readonly string[],
): Segmento[] {
  const segmentos: Segmento[] = [];
  let inicio: number | null = null;
  cabecalho.forEach((nome, coluna) => {
    const gravavel = !calculadas.includes(nome);
    if (gravavel && inicio === null) inicio = coluna;
    if (!gravavel && inicio !== null) {
      segmentos.push({ inicio, fim: coluna });
      inicio = null;
    }
  });
  if (inicio !== null) segmentos.push({ inicio, fim: cabecalho.length });
  return segmentos;
}

/** Valores de um segmento para um registro; coluna ausente no registro mantém `atual`. */
export function valoresDoSegmento(
  cabecalho: readonly string[],
  segmento: Segmento,
  campos: Readonly<Record<string, unknown>>,
  atual: readonly unknown[] = [],
): unknown[] {
  const valores: unknown[] = [];
  for (let coluna = segmento.inicio; coluna < segmento.fim; coluna++) {
    const nome = cabecalho[coluna] ?? '';
    valores.push(nome in campos ? campos[nome] : (atual[coluna] ?? ''));
  }
  return valores;
}

/** A1: 0 → A, 25 → Z, 26 → AA. */
export function letraDaColuna(indice: number): string {
  let letras = '';
  for (let n = indice + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    letras = String.fromCharCode(65 + ((n - 1) % 26)) + letras;
  }
  return letras;
}

/**
 * Célula de data → `DataISO`. O Apps Script devolve `Date` no fuso do script,
 * que é o mesmo da planilha (America/Sao_Paulo), então os getters locais valem.
 */
export function lerData(valor: unknown): DataISO | null {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    const mes = (valor.getMonth() + 1).toString().padStart(2, '0');
    const dia = valor.getDate().toString().padStart(2, '0');
    return dataISO(`${valor.getFullYear()}-${mes}-${dia}`);
  }
  if (typeof valor === 'string' && valor.trim() !== '') {
    try {
      return dataISO(valor.trim());
    } catch {
      return null;
    }
  }
  return null;
}

export function escreverData(data: DataISO): Date {
  return new Date(Number(data.slice(0, 4)), Number(data.slice(5, 7)) - 1, Number(data.slice(8)));
}

export function lerTexto(valor: unknown): string {
  return valor === null || valor === undefined ? '' : String(valor).trim();
}

export function lerBooleano(valor: unknown): boolean {
  return valor === true || lerTexto(valor).toUpperCase() === 'TRUE';
}

function vazia(celula: unknown): boolean {
  return celula === '' || celula === null || celula === undefined;
}
