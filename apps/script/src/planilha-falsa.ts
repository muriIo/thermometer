// Planilha em memória para testar a API sem SpreadsheetApp. Usada só pelos testes.
import { DEFINICOES, definicao, type NomeAba } from './esquema';
import type { Bloco, Planilha } from './porta';
import { lerTabela, type Tabela } from './tabela';

export class PlanilhaFalsa implements Planilha {
  readonly abas = new Map<NomeAba, unknown[][]>(
    DEFINICOES.map((def) => [
      def.nome,
      [[...def.colunas], ...def.linhasIniciais.map((l) => [...l])],
    ]),
  );
  readonly blocos = new Map<string, Bloco>();

  ler(aba: NomeAba): Tabela {
    return lerTabela(this.linhas(aba));
  }

  acrescentar(aba: NomeAba, registros: readonly Readonly<Record<string, unknown>>[]): void {
    const [cabecalho = []] = this.linhas(aba);
    for (const registro of registros) {
      this.linhas(aba).push(
        cabecalho.map((nome) =>
          String(nome) in registro ? this.gravavel(aba, String(nome), registro[String(nome)]) : '',
        ),
      );
    }
  }

  atualizar(aba: NomeAba, linha: number, campos: Readonly<Record<string, unknown>>): void {
    const [cabecalho = []] = this.linhas(aba);
    const atual = this.linhas(aba)[linha - 1];
    if (!atual) throw new Error(`Linha ${linha} não existe em ${aba}`);
    cabecalho.forEach((nome, i) => {
      if (String(nome) in campos) atual[i] = this.gravavel(aba, String(nome), campos[String(nome)]);
    });
  }

  bloco(ano: number, mes: number): Bloco | null {
    return this.blocos.get(`${ano}-${mes}`) ?? null;
  }

  /** Simula uma edição feita à mão na planilha. */
  editarAMao(aba: NomeAba, id: string, campos: Readonly<Record<string, unknown>>): void {
    const linha = this.ler(aba).registros.find((r) => r.dados.id === id)?.linha;
    if (!linha) throw new Error(`id ${id} não existe`);
    this.atualizar(aba, linha, campos);
  }

  private linhas(aba: NomeAba): unknown[][] {
    const linhas = this.abas.get(aba);
    if (!linhas) throw new Error(`Aba ${aba} não existe`);
    return linhas;
  }

  /** Como o Sheets: coluna ƒ não aceita valor; `'` inicial força texto e some. */
  private gravavel(aba: NomeAba, coluna: string, valor: unknown): unknown {
    if (definicao(aba).calculadas.includes(coluna))
      throw new Error(`Escrita na coluna ƒ ${coluna}`);
    return typeof valor === 'string' && valor.startsWith("'") ? valor.slice(1) : valor;
  }
}
