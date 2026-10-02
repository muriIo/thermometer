// Porta da API sobre SpreadsheetApp (a falsa, para testes, está em planilha-falsa.ts).
import { celulasDoDia } from './formulas';
import { aba, acrescentar, atualizarLinha, ler } from './planilha';
import type { Planilha } from './porta';

export function planilhaReal(): Planilha {
  return {
    ler: (nome) => ler(nome).tabela,
    acrescentar,
    atualizar: atualizarLinha,
    bloco(ano, mes) {
      const destino = aba(String(ano));
      if (!destino) return null;
      const primeiro = celulasDoDia(ano, mes, 1);
      // Data fica uma coluna antes de Entrada; o bloco vai até o Saldo.
      const intervalo = destino.getRange(primeiro.linha, primeiro.entrada - 1, 31, 5);
      return { valores: intervalo.getValues(), formulas: intervalo.getFormulas() };
    },
  };
}
