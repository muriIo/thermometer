/**
 * O que a API precisa da planilha. A implementação real usa SpreadsheetApp
 * (planilha-real.ts); os testes usam uma planilha falsa em memória
 * (docs/engenharia.md, 5).
 */
import type { NomeAba } from './esquema';
import type { Tabela } from './tabela';

/** Data, Entrada, Saída, Diário e Saldo de um bloco, dias 1–31 (linhas 3–33). */
export type Bloco = {
  readonly valores: readonly (readonly unknown[])[];
  readonly formulas: readonly (readonly string[])[];
};

export interface Planilha {
  ler(aba: NomeAba): Tabela;
  acrescentar(aba: NomeAba, registros: readonly Readonly<Record<string, unknown>>[]): void;
  /** Escreve só os campos informados, nunca nas colunas ƒ. `linha` é 1-based. */
  atualizar(aba: NomeAba, linha: number, campos: Readonly<Record<string, unknown>>): void;
  /** `null` se não existe aba para o ano. */
  bloco(ano: number, mes: number): Bloco | null;
}
