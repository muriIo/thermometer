/**
 * O que a aplicação precisa do mundo de fora (docs/engenharia.md, seção 2).
 * A `infra` implementa; os testes usam versões em memória.
 */
import type { Acao, CodigoErro, PayloadDe, RespostaDe } from '@termometro/contract';
import type { DataISO } from '@termometro/dominio';
import type { Guardado, Mudanca } from './guardado.ts';

/**
 * `rede`: a chamada não chegou ou a resposta não voltou (sem rede, timeout,
 * HTTP fora do contrato). Não se sabe se o script aplicou. `api`: o script
 * respondeu com um erro do contrato.
 */
export type FalhaDaApi =
  | { readonly tipo: 'rede'; readonly mensagem: string }
  | { readonly tipo: 'api'; readonly codigo: CodigoErro; readonly mensagem: string };

export type ResultadoDaApi<T> =
  | { readonly ok: true; readonly dados: T }
  | { readonly ok: false; readonly falha: FalhaDaApi };

/** O Web App do Apps Script (PROJECT.md, seção 6). */
export interface Api {
  chamar<A extends Acao>(
    acao: A,
    payload: PayloadDe<A>,
    token: string,
  ): Promise<ResultadoDaApi<RespostaDe<A>>>;
}

/** Banco local (PROJECT.md, 8.3). `aplicar` grava a mudança inteira ou nada. */
export interface Armazem {
  carregar(): Promise<Guardado>;
  aplicar(mudanca: Mudanca): Promise<void>;
}

/** Secure storage do token (PROJECT.md, 8.5). */
export interface Cofre {
  lerToken(): Promise<string | null>;
  guardarToken(token: string): Promise<void>;
}

/** O "hoje" e o "agora" entram por aqui, nunca por `Date.now()` solto. */
interface Relogio {
  hoje(): DataISO;
  agora(): number;
}

/** Timers da nova tentativa. Devolve a função que cancela. */
export interface Agendador {
  agendar(ms: number, tarefa: () => void): () => void;
}

export type Portas = {
  readonly api: Api;
  readonly armazem: Armazem;
  readonly cofre: Cofre;
  readonly relogio: Relogio;
  readonly agendador: Agendador;
  /** UUID para lançamentos, grupos e operações. */
  readonly novoId: () => string;
};
