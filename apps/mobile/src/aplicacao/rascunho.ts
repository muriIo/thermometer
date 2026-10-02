/**
 * O que a tela Lançar preenche, e as linhas que isso vira na API. Tudo é
 * validado aqui, antes de entrar na fila: um payload que o script recusaria
 * ficaria travado na fila em vez de chegar à planilha.
 */

import type { RespostaReferencias } from '@termometro/contract';
import { type LinhaNova, linhaNovaSchema } from '@termometro/contract';
import {
  centavos,
  type DataISO,
  type Estorna,
  type Meio,
  parcelar,
  type Quem,
  type Tipo,
} from '@termometro/dominio';

export type Rascunho = {
  readonly data: DataISO;
  readonly valorCentavos: number;
  readonly tipo: Tipo;
  readonly estorna?: Estorna;
  readonly categoria?: string;
  readonly descricao?: string;
  readonly quem: Quem;
  readonly meio: Meio;
  readonly cartao?: string;
  /** Total dividido em N parcelas (PROJECT.md, 5.5). Ausente ou 1 é à vista numa linha só. */
  readonly parcelas?: number;
};

export type ResultadoDoRascunho =
  | { readonly ok: true; readonly linhas: LinhaNova[] }
  | { readonly ok: false; readonly problema: string };

export function linhasDoRascunho(
  rascunho: Rascunho,
  referencias: RespostaReferencias | null,
  novoId: () => string,
): ResultadoDoRascunho {
  const { parcelas = 1, ...campos } = rascunho;
  if (!Number.isSafeInteger(campos.valorCentavos) || campos.valorCentavos <= 0) {
    return { ok: false, problema: 'valor precisa ser maior que zero, em centavos inteiros' };
  }
  const maximo = referencias?.limites.valorMaximoCentavos;
  if (maximo !== undefined && campos.valorCentavos > maximo) {
    return { ok: false, problema: `valor acima do máximo da planilha (${maximo} centavos)` };
  }
  if (parcelas > campos.valorCentavos) {
    return { ok: false, problema: 'mais parcelas que centavos' };
  }

  const base = { ...campos, valorCentavos: centavos(campos.valorCentavos) };
  const linhas: LinhaNova[] =
    parcelas > 1
      ? parcelar(base, parcelas, novoId)
      : [{ ...base, id: novoId(), status: 'confirmado' }];

  for (const linha of linhas) {
    const validacao = linhaNovaSchema.safeParse(linha);
    if (!validacao.success) {
      return { ok: false, problema: validacao.error.issues.map((i) => i.message).join('; ') };
    }
  }
  return { ok: true, linhas };
}
