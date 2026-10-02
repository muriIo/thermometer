import {
  type Acao,
  falha,
  PAYLOADS,
  type PayloadDe,
  type Requisicao,
  type Resposta,
  requisicaoSchema,
  sucesso,
  VERSOES_ACEITAS,
} from '@termometro/contract';
import type { DataISO } from '@termometro/dominio';
import { referencias, resumo } from './api-consultas';
import type { Contexto } from './api-contexto';
import { editar, excluir, lancar, listar } from './api-lancamentos';
import type { Planilha } from './porta';
import { autenticar, type Tokens } from './tokens';

/** Tudo que o roteador precisa do mundo de fora, para poder ser testado no Node. */
export type Ambiente = {
  tokens: Tokens;
  versaoScript: string;
  agora: () => Date;
  hoje: () => DataISO;
  planilha: Planilha;
  /** Falso na planilha real sem `PERMITIR_PLANILHA_REAL` (ver seguranca.ts). */
  podeEscrever: boolean;
  /** Toda escrita roda dentro do lock do script (PROJECT.md, 7). */
  comLock: <T>(acao: () => T) => T;
};

function lerCorpo(corpo: string): Requisicao | null {
  try {
    const resultado = requisicaoSchema.safeParse(JSON.parse(corpo));
    return resultado.success ? resultado.data : null;
  } catch {
    return null;
  }
}

function comPayload<A extends Acao, T>(
  acao: A,
  bruto: unknown,
  executar: (payload: PayloadDe<A>) => Resposta<T>,
): Resposta<T> {
  const resultado = PAYLOADS[acao].safeParse(bruto);
  if (!resultado.success) {
    const motivos = resultado.error.issues.map((i) =>
      i.path.length > 0 ? `${i.path.join('.')}: ${i.message}` : i.message,
    );
    return falha('INVALID_PAYLOAD', motivos.join('; '));
  }
  return executar(resultado.data as PayloadDe<A>);
}

export function rotear(corpo: string, ambiente: Ambiente): Resposta<unknown> {
  const requisicao = lerCorpo(corpo);
  if (!requisicao) return falha('INVALID_PAYLOAD', 'Requisição inválida');

  const nome = autenticar(ambiente.tokens, requisicao.token);
  if (!nome) return falha('UNAUTHORIZED', 'Token inválido');

  if (!VERSOES_ACEITAS.includes(requisicao.v)) {
    return falha('UNSUPPORTED_VERSION', `Versão ${requisicao.v} não suportada`);
  }

  const contexto: Contexto = {
    planilha: ambiente.planilha,
    nome,
    agora: ambiente.agora(),
    hoje: ambiente.hoje(),
  };
  const escrever = <T>(acao: () => Resposta<T>): Resposta<T> =>
    ambiente.podeEscrever
      ? ambiente.comLock(acao)
      : falha('INTERNAL', 'Escrita bloqueada nesta planilha');
  const { action, payload } = requisicao;

  switch (action) {
    case 'ping':
      return sucesso({
        versaoScript: ambiente.versaoScript,
        horaServidor: contexto.agora.toISOString(),
        nome,
      });
    case 'referencias':
      return referencias(contexto);
    case 'listar':
      return comPayload(action, payload, (p) => listar(p, contexto));
    case 'resumo':
      return comPayload(action, payload, (p) => resumo(p, contexto));
    case 'lancar':
      return comPayload(action, payload, (p) => escrever(() => lancar(p, contexto)));
    case 'editar':
      return comPayload(action, payload, (p) => escrever(() => editar(p, contexto)));
    case 'excluir':
      return comPayload(action, payload, (p) => escrever(() => excluir(p, contexto)));
  }
}
