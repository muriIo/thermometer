// Só o que os testes usam do SQLite embutido no Node (node:sqlite), que roda
// o armazém com SQL de verdade fora do aparelho. O app não carrega isto.
declare module 'node:sqlite' {
  type Valor = string | number | null;
  export class DatabaseSync {
    constructor(caminho: string);
    exec(sql: string): void;
    prepare(sql: string): {
      all(...parametros: Valor[]): unknown[];
      run(...parametros: Valor[]): unknown;
    };
  }
}
