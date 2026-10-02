/**
 * Banco local em SQLite (PROJECT.md, 8.3; ADR 0010). Espelho e fila em
 * tabelas próprias, o resto em `meta` (chave → JSON). Cada `aplicar` é uma
 * transação, com a mesma semântica de `aplicarMudanca`.
 */
import {
  aplicarMudanca,
  type Guardado,
  type Mudanca,
  NADA_GUARDADO,
} from '../aplicacao/guardado.ts';
import type { Armazem } from '../aplicacao/portas.ts';

type Valor = string | number | null;

/** O pedaço de `SQLiteDatabase` (expo-sqlite) que o armazém usa. */
export interface BancoSql {
  execAsync(sql: string): Promise<void>;
  getAllAsync<T>(sql: string, ...parametros: Valor[]): Promise<T[]>;
  runAsync(sql: string, ...parametros: Valor[]): Promise<unknown>;
  withTransactionAsync(tarefa: () => Promise<void>): Promise<void>;
}

/** Linhas guardadas como JSON: o formato acompanha os tipos do contrato sem migração por campo. */
export const MIGRACOES = [
  {
    to: 1,
    up: (banco: Pick<BancoSql, 'execAsync'>) =>
      banco.execAsync(`
        CREATE TABLE espelho (id TEXT PRIMARY KEY, data TEXT NOT NULL, json TEXT NOT NULL);
        CREATE INDEX espelho_por_data ON espelho (data);
        CREATE TABLE fila (op_id TEXT PRIMARY KEY, seq INTEGER NOT NULL, json TEXT NOT NULL);
        CREATE TABLE meta (chave TEXT PRIMARY KEY, json TEXT NOT NULL);
      `),
  },
] as const;

const CHAVES_META = ['referencias', 'resumo', 'dono', 'ultimaSincronizacao'] as const;

export class ArmazemSqlite implements Armazem {
  /** Transações em série: o expo-sqlite não aninha `withTransactionAsync` na mesma conexão. */
  private anterior: Promise<unknown> = Promise.resolve();

  constructor(private readonly abrir: () => Promise<BancoSql>) {}

  async carregar(): Promise<Guardado> {
    const banco = await this.abrir();
    const espelho = await banco.getAllAsync<{ json: string }>(
      'SELECT json FROM espelho ORDER BY data, id',
    );
    const fila = await banco.getAllAsync<{ json: string }>('SELECT json FROM fila ORDER BY seq');
    const meta = await banco.getAllAsync<{ chave: string; json: string }>(
      'SELECT chave, json FROM meta',
    );
    const lidos = Object.fromEntries(meta.map((m) => [m.chave, JSON.parse(m.json)]));
    return aplicarMudanca(NADA_GUARDADO, {
      espelho: { gravar: espelho.map((l) => JSON.parse(l.json)) },
      fila: { gravar: fila.map((o) => JSON.parse(o.json)) },
      ...lidos,
    });
  }

  aplicar(mudanca: Mudanca): Promise<void> {
    const tarefa = this.anterior.then(async () => {
      const banco = await this.abrir();
      await banco.withTransactionAsync(() => gravar(banco, mudanca));
    });
    this.anterior = tarefa.catch(() => {});
    return tarefa;
  }
}

async function gravar(banco: BancoSql, mudanca: Mudanca): Promise<void> {
  const { espelho, fila } = mudanca;
  if (espelho?.substituir) {
    const { de, ate } = espelho.substituir;
    await banco.runAsync('DELETE FROM espelho WHERE data BETWEEN ? AND ?', de, ate);
  }
  for (const id of espelho?.remover ?? []) {
    await banco.runAsync('DELETE FROM espelho WHERE id = ?', id);
  }
  for (const linha of espelho?.gravar ?? []) {
    await banco.runAsync(
      'INSERT OR REPLACE INTO espelho (id, data, json) VALUES (?, ?, ?)',
      linha.id,
      linha.data,
      JSON.stringify(linha),
    );
  }
  for (const opId of fila?.remover ?? []) {
    await banco.runAsync('DELETE FROM fila WHERE op_id = ?', opId);
  }
  for (const op of fila?.gravar ?? []) {
    await banco.runAsync(
      'INSERT OR REPLACE INTO fila (op_id, seq, json) VALUES (?, ?, ?)',
      op.opId,
      op.seq,
      JSON.stringify(op),
    );
  }
  for (const chave of CHAVES_META) {
    const valor = mudanca[chave];
    if (valor === undefined) continue;
    await banco.runAsync(
      'INSERT OR REPLACE INTO meta (chave, json) VALUES (?, ?)',
      chave,
      JSON.stringify(valor),
    );
  }
}
