// BancoSql sobre o SQLite embutido no Node, para testar o armazém fora do aparelho.
import { DatabaseSync } from 'node:sqlite';
import { type BancoSql, MIGRACOES } from './armazem-sqlite.ts';

export async function bancoNode(): Promise<BancoSql> {
  const sqlite = new DatabaseSync(':memory:');
  let emTransacao = false;
  const banco: BancoSql = {
    execAsync: async (sql) => sqlite.exec(sql),
    getAllAsync: async <T>(sql: string, ...parametros: (string | number | null)[]) =>
      sqlite.prepare(sql).all(...parametros) as T[],
    runAsync: async (sql, ...parametros) => sqlite.prepare(sql).run(...parametros),
    // Como o expo-sqlite: uma transação aberta na mesma conexão recusa outra.
    withTransactionAsync: async (tarefa) => {
      if (emTransacao) throw new Error('cannot start a transaction within a transaction');
      emTransacao = true;
      sqlite.exec('BEGIN');
      try {
        await tarefa();
        sqlite.exec('COMMIT');
      } catch (erro) {
        sqlite.exec('ROLLBACK');
        throw erro;
      } finally {
        emTransacao = false;
      }
    },
  };
  for (const migracao of MIGRACOES) await migracao.up(banco);
  return banco;
}
