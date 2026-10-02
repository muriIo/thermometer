import type { Centavos } from './centavos';
import { type DataISO, diasEntre } from './datas';
import type { Lancamento, Tipo } from './lancamento';

/** Até quantos dias de distância um previsto ainda parece o mesmo lançamento (PROJECT.md, 10, tela 2). */
const FOLGA_EM_DIAS = 3;

export type Parecido = {
  readonly tipo: Tipo;
  readonly descricao: string;
  readonly valorCentavos: Centavos;
  readonly data: DataISO;
};

/**
 * O previsto que o lançamento sendo digitado provavelmente é, para oferecer
 * "confirmar em vez de criar" e evitar a duplicata do ADR 0003: mesmo tipo, a
 * até 3 dias, e mesma descrição (sem caixa nem espaços nas pontas) ou mesmo
 * valor. Descrição igual vence valor igual; depois, o mais perto.
 */
export function previstoParecido<T extends Lancamento>(
  lancamentos: readonly T[],
  novo: Parecido,
): T | null {
  const descricao = normalizar(novo.descricao);
  const candidatos = lancamentos
    .filter(
      (l) =>
        l.status === 'previsto' &&
        !l.excluido &&
        l.tipo === novo.tipo &&
        Math.abs(diasEntre(l.data, novo.data)) <= FOLGA_EM_DIAS,
    )
    .map((l) => ({
      lancamento: l,
      peloNome: descricao !== '' && normalizar(l.descricao) === descricao,
      distancia: Math.abs(diasEntre(l.data, novo.data)),
    }))
    .filter((c) => c.peloNome || c.lancamento.valorCentavos === novo.valorCentavos)
    .sort((a, b) => Number(b.peloNome) - Number(a.peloNome) || a.distancia - b.distancia);
  return candidatos[0]?.lancamento ?? null;
}

function normalizar(texto: string): string {
  return texto.trim().toLowerCase();
}
