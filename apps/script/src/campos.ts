import { MEIOS, TIPOS } from '@termometro/dominio';
import { lerTexto } from './tabela';

/** Colunas de negócio comuns a Lançamentos, Recorrentes e Migração. */
export type CamposDeNegocio = {
  readonly descricao: string;
  readonly tipo: string;
  readonly estorna: string;
  readonly categoria: string;
  readonly quem: string;
  readonly meio: string;
  readonly cartao: string;
};

export function lerCampos(dados: Readonly<Record<string, unknown>>): CamposDeNegocio {
  return {
    descricao: lerTexto(dados.descricao),
    tipo: lerTexto(dados.tipo),
    estorna: lerTexto(dados.estorna),
    categoria: lerTexto(dados.categoria),
    quem: lerTexto(dados.quem),
    meio: lerTexto(dados.meio) || 'avista',
    cartao: lerTexto(dados.cartao),
  };
}

/** Motivo para recusar os campos, ou `null` (PROJECT.md, 7: listas fechadas). */
export function problemaNosCampos(campos: CamposDeNegocio): string | null {
  if (!incluido(TIPOS, campos.tipo)) return `tipo inválido (${campos.tipo})`;
  if (campos.tipo === 'estorno' && !['diario', 'saida'].includes(campos.estorna)) {
    return 'estorno sem "estorna" (diario ou saida)';
  }
  if (!incluido(MEIOS, campos.meio)) return `meio inválido (${campos.meio})`;
  if (campos.meio === 'cartao' && !campos.cartao) return 'meio cartão sem cartão';
  return null;
}

function incluido(lista: readonly string[], valor: string): boolean {
  return lista.includes(valor);
}
