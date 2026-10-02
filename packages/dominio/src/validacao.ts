import { nomesDeCategorias } from './categorias';
import { ESTORNA, MEIOS, QUEM, TIPOS } from './lancamento';

export const MAXIMO_DESCRICAO = 80;

/** Colunas de negócio como texto, do jeito que chegam da planilha ou do app. */
export type CamposDeNegocio = {
  readonly descricao: string;
  readonly tipo: string;
  readonly estorna: string;
  readonly categoria: string;
  readonly quem: string;
  readonly meio: string;
  readonly cartao: string;
};

/**
 * Motivo para recusar os campos, ou `null`. Listas fechadas e regras entre
 * campos (PROJECT.md, 7: validação), usadas pelo contrato, pelo script e pelo app.
 */
export function problemaNosCampos(campos: CamposDeNegocio): string | null {
  if (!incluido(TIPOS, campos.tipo)) return `tipo inválido (${campos.tipo})`;
  if (campos.tipo === 'estorno' && !incluido(ESTORNA, campos.estorna)) {
    return 'estorno sem "estorna" (diario ou saida)';
  }
  if (campos.tipo !== 'estorno' && campos.estorna) return '"estorna" só vale para estorno';
  if (!incluido(MEIOS, campos.meio)) return `meio inválido (${campos.meio})`;
  if (campos.meio === 'cartao' && !campos.cartao) return 'meio cartão sem cartão';
  if (campos.meio !== 'cartao' && campos.cartao) return 'cartão informado em lançamento à vista';
  if (campos.quem && !incluido(QUEM, campos.quem)) return `quem inválido (${campos.quem})`;
  if (campos.categoria && !nomesDeCategorias().includes(campos.categoria)) {
    return `categoria inválida (${campos.categoria})`;
  }
  if (campos.descricao.length > MAXIMO_DESCRICAO) {
    return `descrição com mais de ${MAXIMO_DESCRICAO} caracteres`;
  }
  return null;
}

function incluido(lista: readonly string[], valor: string): boolean {
  return lista.includes(valor);
}
