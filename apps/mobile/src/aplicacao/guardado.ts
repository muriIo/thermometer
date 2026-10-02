/**
 * O que o app guarda no aparelho e como uma mudança o altera. O `Armazem` em
 * memória e o núcleo usam a mesma função, então a regra do que "aplicar" faz
 * vive num lugar só; o SQLite reproduz a mesma semântica numa transação.
 */
import type { LancamentoSalvo, RespostaReferencias, RespostaResumo } from '@termometro/contract';
import type { DataISO } from '@termometro/dominio';
import { emOrdem, type Operacao } from './operacao.ts';

type ResumoGuardado = {
  readonly resumo: RespostaResumo;
  /** Quando o pedido saiu; o que foi concluído depois não está neste resumo. */
  readonly pedidoEm: number;
};

export type Guardado = {
  /** Linhas como a planilha devolveu, sem nada pendente aplicado. */
  readonly espelho: readonly LancamentoSalvo[];
  readonly fila: readonly Operacao[];
  readonly referencias: RespostaReferencias | null;
  readonly resumo: ResumoGuardado | null;
  /** Nome do dono do token, vindo do `ping`. */
  readonly dono: string | null;
  readonly ultimaSincronizacao: number | null;
};

/**
 * No espelho, nesta ordem: `substituir` apaga as linhas com `data` no
 * intervalo, `remover` apaga por id, `gravar` insere ou troca por id. Na
 * fila, `gravar` insere ou troca por `opId` e `remover` apaga por `opId`.
 */
export type Mudanca = {
  readonly espelho?: {
    readonly substituir?: { readonly de: DataISO; readonly ate: DataISO };
    readonly remover?: readonly string[];
    readonly gravar?: readonly LancamentoSalvo[];
  };
  readonly fila?: {
    readonly remover?: readonly string[];
    readonly gravar?: readonly Operacao[];
  };
  readonly referencias?: RespostaReferencias;
  readonly resumo?: ResumoGuardado;
  readonly dono?: string;
  readonly ultimaSincronizacao?: number;
};

export const NADA_GUARDADO: Guardado = {
  espelho: [],
  fila: [],
  referencias: null,
  resumo: null,
  dono: null,
  ultimaSincronizacao: null,
};

export function aplicarMudanca(guardado: Guardado, mudanca: Mudanca): Guardado {
  return {
    espelho: mudanca.espelho ? novoEspelho(guardado.espelho, mudanca.espelho) : guardado.espelho,
    fila: mudanca.fila ? novaFila(guardado.fila, mudanca.fila) : guardado.fila,
    referencias: mudanca.referencias ?? guardado.referencias,
    resumo: mudanca.resumo ?? guardado.resumo,
    dono: mudanca.dono ?? guardado.dono,
    ultimaSincronizacao: mudanca.ultimaSincronizacao ?? guardado.ultimaSincronizacao,
  };
}

function novoEspelho(
  espelho: readonly LancamentoSalvo[],
  mudanca: NonNullable<Mudanca['espelho']>,
): LancamentoSalvo[] {
  const { substituir } = mudanca;
  const removidos = new Set([
    ...(mudanca.remover ?? []),
    ...(mudanca.gravar ?? []).map((l) => l.id),
  ]);
  const mantidos = espelho.filter(
    (l) =>
      !removidos.has(l.id) && !(substituir && l.data >= substituir.de && l.data <= substituir.ate),
  );
  return [...mantidos, ...(mudanca.gravar ?? [])];
}

function novaFila(fila: readonly Operacao[], mudanca: NonNullable<Mudanca['fila']>): Operacao[] {
  const removidas = new Set([
    ...(mudanca.remover ?? []),
    ...(mudanca.gravar ?? []).map((o) => o.opId),
  ]);
  return emOrdem([...fila.filter((o) => !removidas.has(o.opId)), ...(mudanca.gravar ?? [])]);
}
