import {
  falha,
  type Requisicao,
  type Resposta,
  requisicaoSchema,
  sucesso,
  VERSOES_ACEITAS,
} from '@termometro/contract';
import { autenticar, type Tokens } from './tokens';

/** Tudo que o roteador precisa do mundo de fora, para poder ser testado no Node. */
export type Ambiente = {
  tokens: Tokens;
  versaoScript: string;
  agora: () => Date;
};

function lerCorpo(corpo: string): Requisicao | null {
  try {
    const resultado = requisicaoSchema.safeParse(JSON.parse(corpo));
    return resultado.success ? resultado.data : null;
  } catch {
    return null;
  }
}

export function rotear(corpo: string, ambiente: Ambiente): Resposta<unknown> {
  const requisicao = lerCorpo(corpo);
  if (!requisicao) return falha('INVALID_PAYLOAD', 'Requisição inválida');

  const nome = autenticar(ambiente.tokens, requisicao.token);
  if (!nome) return falha('UNAUTHORIZED', 'Token inválido');

  if (!VERSOES_ACEITAS.includes(requisicao.v)) {
    return falha('UNSUPPORTED_VERSION', `Versão ${requisicao.v} não suportada`);
  }

  switch (requisicao.action) {
    case 'ping':
      return sucesso({
        versaoScript: ambiente.versaoScript,
        horaServidor: ambiente.agora().toISOString(),
        nome,
      });
  }
}
