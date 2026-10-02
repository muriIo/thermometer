/** Abas de ano (`2026`, `2027`…): qual é a próxima e até onde gerar. */
import { type DataISO, horizonte } from '@termometro/dominio';
import { celulasDoDia } from './formulas';
import { letraDaColuna } from './tabela';

export function anosComAba(nomes: readonly string[]): number[] {
  return nomes
    .filter((nome) => /^\d{4}$/.test(nome))
    .map(Number)
    .sort((a, b) => a - b);
}

/**
 * Recorrências e faturas vão até o horizonte (31/12 do ano seguinte) ou até
 * o fim do último ano com aba, o que vier depois: criar a aba de 2028 antes
 * de 2027 começar já estende a geração.
 */
export function fimDaGeracao(hoje: DataISO, anos: readonly number[]): DataISO {
  const ultimo = anos.at(-1);
  const fimDoUltimoAno = ultimo === undefined ? '' : `${ultimo}-12-31`;
  const doHorizonte = horizonte(hoje);
  return (fimDoUltimoAno > doHorizonte ? fimDoUltimoAno : doHorizonte) as DataISO;
}

/**
 * Saldo de 1º de janeiro: o de 31/12 do ano anterior + Entrada − (Saída +
 * Diário), como a planilha original faz (PROJECT.md, 3.2).
 */
export function formulaSaldoDeAbertura(ano: number): string {
  const dezembro = celulasDoDia(ano - 1, 12, 31);
  const janeiro = celulasDoDia(ano, 1, 1);
  const celula = (coluna: number) => `${letraDaColuna(coluna - 1)}${janeiro.linha}`;
  return (
    `='${ano - 1}'!${letraDaColuna(dezembro.saldo - 1)}${dezembro.linha}` +
    `+(${celula(janeiro.entrada)})-(${celula(janeiro.saida)}+${celula(janeiro.diario)})`
  );
}
