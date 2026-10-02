/**
 * Cliente do Web App do Apps Script (PROJECT.md, 6.1): um endpoint, sempre
 * POST, token no corpo. O Apps Script responde com 302 para
 * script.googleusercontent.com e o fetch segue sozinho.
 *
 * Tudo que não é uma resposta do contrato vira falha de `rede`: a fila trata
 * como "não se sabe se aplicou" e reenvia, o que é seguro (ADR 0010).
 */
import {
  type Acao,
  CODIGOS_ERRO,
  type CodigoErro,
  type PayloadDe,
  type RespostaDe,
  VERSAO_CONTRATO,
} from '@termometro/contract';
import type { Api, ResultadoDaApi } from '../aplicacao/portas.ts';

/** O pedaço do `fetch` que o cliente usa; os testes passam um falso. */
export type Buscar = (
  url: string,
  init: { method: 'POST'; headers: Record<string, string>; body: string; signal: AbortSignal },
) => Promise<{ status: number; text(): Promise<string> }>;

/** O script pode esperar o lock e partir a frio; acima disto, desiste e a fila tenta depois. */
const LIMITE_MS = 30_000;

export class ApiAppsScript implements Api {
  constructor(
    private readonly url: string,
    private readonly buscar: Buscar,
    private readonly limiteMs = LIMITE_MS,
  ) {}

  async chamar<A extends Acao>(
    acao: A,
    payload: PayloadDe<A>,
    token: string,
  ): Promise<ResultadoDaApi<RespostaDe<A>>> {
    if (!this.url) return rede('URL do Web App não configurada (EXPO_PUBLIC_API_URL).');
    const cancelar = new AbortController();
    const relogio = setTimeout(() => cancelar.abort(), this.limiteMs);
    try {
      const resposta = await this.buscar(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ v: VERSAO_CONTRATO, token, action: acao, payload }),
        signal: cancelar.signal,
      });
      return lerResposta<RespostaDe<A>>(resposta.status, await resposta.text());
    } catch (erro) {
      if (cancelar.signal.aborted) return rede(`sem resposta em ${this.limiteMs} ms`);
      return rede(erro instanceof Error ? erro.message : String(erro));
    } finally {
      clearTimeout(relogio);
    }
  }
}

function lerResposta<T>(status: number, texto: string): ResultadoDaApi<T> {
  const corpo = jsonOuNada(texto);
  if (status !== 200 || !ehObjeto(corpo) || typeof corpo.ok !== 'boolean') {
    return rede(`resposta fora do contrato (HTTP ${status})`);
  }
  if (corpo.ok) return { ok: true, dados: corpo.data as T };
  const erro = ehObjeto(corpo.error) ? corpo.error : {};
  if (!CODIGOS_ERRO.includes(erro.code as CodigoErro)) {
    return rede(`erro fora do contrato: ${String(erro.code)}`);
  }
  return {
    ok: false,
    falha: { tipo: 'api', codigo: erro.code as CodigoErro, mensagem: String(erro.message ?? '') },
  };
}

function jsonOuNada(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

function rede(mensagem: string): ResultadoDaApi<never> {
  return { ok: false, falha: { tipo: 'rede', mensagem } };
}
