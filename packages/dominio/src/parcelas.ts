import { type Centavos, centavos } from './centavos';
import { type DataISO, somarMeses } from './datas';
import type { Meio, Status } from './lancamento';

/** O mínimo que um lançamento precisa ter para ser parcelado. */
export type Parcelavel = {
  readonly data: DataISO;
  readonly valorCentavos: Centavos;
  readonly meio: Meio;
};

export type Parcela<T extends Parcelavel> = Omit<T, 'data' | 'valorCentavos'> & {
  readonly id: string;
  readonly data: DataISO;
  readonly valorCentavos: Centavos;
  readonly status: Status;
  readonly grupoId: string;
  readonly parcelaN: number;
  readonly parcelas: number;
};

/**
 * Divide o total em `parcelas` partes em centavos; a sobra vai para a 1ª
 * (R$ 100 em 3× = 33,34 + 33,33 + 33,33), então a soma fecha exata.
 */
export function dividirEmParcelas(total: Centavos, parcelas: number): Centavos[] {
  if (!Number.isSafeInteger(parcelas) || parcelas < 1) {
    throw new RangeError(`Número de parcelas inválido: ${parcelas}`);
  }
  if (total < parcelas) {
    throw new RangeError(`Total de ${total} centavos não cabe em ${parcelas} parcelas`);
  }
  const base = Math.floor(total / parcelas);
  const sobra = total - base * parcelas;
  return Array.from({ length: parcelas }, (_, i) => centavos(i === 0 ? base + sobra : base));
}

/**
 * Gera as N linhas de um parcelamento a partir do total (PROJECT.md, 5.5;
 * ADR 0005). `novoId` cria os UUIDs (das linhas e do grupo) fora do domínio.
 *
 * - Cartão: todas na data da compra e `confirmado`; a fatura de cada parcela
 *   é deslocada pela coluna `fatura_id` (ver `mesDaFatura`).
 * - À vista: parcela k em `data + (k−1) meses`; a 1ª `confirmado`, as
 *   demais `previsto`.
 */
export function parcelar<T extends Parcelavel>(
  lancamento: T,
  parcelas: number,
  novoId: () => string,
): Parcela<T>[] {
  const valores = dividirEmParcelas(lancamento.valorCentavos, parcelas);
  const grupoId = novoId();
  const noCartao = lancamento.meio === 'cartao';
  return valores.map((valorCentavos, i) => ({
    ...lancamento,
    id: novoId(),
    data: noCartao ? lancamento.data : somarMeses(lancamento.data, i),
    valorCentavos,
    status: noCartao || i === 0 ? 'confirmado' : 'previsto',
    grupoId,
    parcelaN: i + 1,
    parcelas,
  }));
}
