import { z } from 'zod';

/** Versão atual do contrato. O script aceita esta e a anterior (PROJECT.md, 6.3). */
export const VERSAO_CONTRATO = 1;
export const VERSOES_ACEITAS: readonly number[] = [VERSAO_CONTRATO, VERSAO_CONTRATO - 1].filter(
  (v) => v >= 1,
);

export const ACOES = ['ping'] as const;
export type Acao = (typeof ACOES)[number];

export const CODIGOS_ERRO = [
  'UNAUTHORIZED',
  'INVALID_PAYLOAD',
  'NOT_FOUND',
  'CONFLICT',
  'UNSUPPORTED_VERSION',
  'INTERNAL',
] as const;
export type CodigoErro = (typeof CODIGOS_ERRO)[number];

export const requisicaoSchema = z.object({
  v: z.number().int().positive(),
  token: z.string().min(1),
  action: z.enum(ACOES),
  payload: z.unknown(),
});
export type Requisicao = z.infer<typeof requisicaoSchema>;

export type Resposta<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: CodigoErro; message: string } };

export type RespostaPing = {
  versaoScript: string;
  horaServidor: string;
  nome: string;
};

export function sucesso<T>(data: T): Resposta<T> {
  return { ok: true, data };
}

export function falha(code: CodigoErro, message: string): Resposta<never> {
  return { ok: false, error: { code, message } };
}
