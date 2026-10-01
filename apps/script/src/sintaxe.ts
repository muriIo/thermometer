/**
 * `setFormula` interpreta a fórmula na localidade da planilha: em pt-BR a
 * vírgula é decimal e `=SUM(1,2)` vira 1,2. As fórmulas são montadas em
 * en-US e traduzidas aqui só no separador de argumentos; os nomes das
 * funções em inglês são aceitos em qualquer localidade.
 */
export type Separador = ',' | ';';

/** Idiomas cuja planilha usa ponto decimal (e vírgula entre argumentos). */
const PONTO_DECIMAL = ['en', 'ja', 'zh', 'ko', 'th', 'he', 'hi'];

export function separadorDaLocalidade(localidade: string): Separador {
  const idioma = localidade.split(/[_-]/)[0]?.toLowerCase() ?? '';
  return PONTO_DECIMAL.includes(idioma) ? ',' : ';';
}

/** Troca `,` por `separador` fora de textos entre aspas. */
export function localizarFormula(formula: string, separador: Separador): string {
  if (separador === ',') return formula;
  let resultado = '';
  let emTexto = false;
  for (const caractere of formula) {
    if (caractere === '"') emTexto = !emTexto;
    resultado += caractere === ',' && !emTexto ? separador : caractere;
  }
  return resultado;
}
