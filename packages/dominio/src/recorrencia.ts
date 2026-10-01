import type { Centavos } from './centavos';
import { type DataISO, diaDoMes, mesDe, somarMesesAoMes } from './datas';
import type { Status } from './lancamento';

/**
 * Até onde recorrências e faturas são geradas: 31/12 do ano seguinte, que é
 * até onde vão as abas de ano (CONTEXT.md, "Horizonte").
 */
export function horizonte(hoje: DataISO): DataISO {
  return `${Number(hoje.slice(0, 4)) + 1}-12-31` as DataISO;
}

/** Uma linha da aba `Recorrentes` (PROJECT.md, 5.2). */
export type Recorrencia = {
  readonly id: string;
  /** 1–31; dia que não existe no mês = último dia do mês. */
  readonly dia: number;
  readonly inicio: DataISO;
  /** Ausente = sem fim (até o horizonte). */
  readonly fim?: DataISO | undefined;
  readonly ativo: boolean;
  readonly valorCentavos: Centavos;
};

type CamposDeControle = 'id' | 'dia' | 'inicio' | 'fim' | 'ativo';

/** Linha de Lançamentos gerada por uma regra; os demais campos vêm da regra. */
export type LinhaRecorrente<R extends Recorrencia> = Omit<R, CamposDeControle> & {
  readonly id: string;
  readonly recorrenciaId: string;
  readonly data: DataISO;
  readonly status: 'previsto';
};

/**
 * Linha já gravada com `recorrencia_id` desta regra e não excluída. O script
 * deve trazer todas as colunas de negócio, mesmo vazias, para a comparação.
 */
export type LinhaExistente = {
  readonly id: string;
  readonly data: DataISO;
  readonly status: Status;
  readonly [campo: string]: unknown;
};

export type PlanoDaRecorrencia<R extends Recorrencia> = {
  readonly criar: LinhaRecorrente<R>[];
  /** Linhas com o `id` existente e os campos novos. */
  readonly atualizar: LinhaRecorrente<R>[];
  /** Ids para exclusão lógica. */
  readonly excluir: string[];
};

/** Datas de ocorrência da regra entre `de` e `ate`, inclusive. */
export function datasDaRecorrencia(regra: Recorrencia, de: DataISO, ate: DataISO): DataISO[] {
  if (!Number.isInteger(regra.dia) || regra.dia < 1 || regra.dia > 31) {
    throw new RangeError(`Dia de recorrência inválido: ${regra.dia}`);
  }
  const inicio = maior(regra.inicio, de);
  const fim = regra.fim !== undefined && regra.fim < ate ? regra.fim : ate;
  const datas: DataISO[] = [];
  for (let mes = mesDe(inicio); mes <= mesDe(fim); mes = somarMesesAoMes(mes, 1)) {
    const data = diaDoMes(mes, regra.dia);
    if (data >= inicio && data <= fim) datas.push(data);
  }
  return datas;
}

/**
 * O que gravar para a regra ficar refletida até `ate`, "daqui para a frente"
 * (ADR 0005). Uma ocorrência por mês, casada com a linha existente pelo mês:
 *
 * - Mês com linha confirmada ou previsto vencido (antes de `hoje`) não muda.
 * - Mês cuja ocorrência já passou não muda, nem um previsto futuro nele.
 * - Previsto futuro de um mês ainda devido é atualizado no lugar (mantém o
 *   `id`); repetidos no mesmo mês são excluídos; mês sem linha ganha uma.
 * - Previsto futuro num mês que a regra não cobre mais (fim antecipado,
 *   regra inativa) é excluído.
 */
export function planejarRecorrencia<R extends Recorrencia>(
  regra: R,
  existentes: readonly LinhaExistente[],
  hoje: DataISO,
  ate: DataISO,
  novoId: () => string,
): PlanoDaRecorrencia<R> {
  const plano: PlanoDaRecorrencia<R> = { criar: [], atualizar: [], excluir: [] };
  const porMes = agruparPorMes(existentes);
  const mesesDaRegra = new Set<string>();
  const desejadas = regra.ativo ? datasDaRecorrencia(regra, diaDoMes(mesDe(hoje), 1), ate) : [];

  for (const data of desejadas) {
    const mes = mesDe(data);
    mesesDaRegra.add(mes);
    const doMes = porMes.get(mes) ?? [];
    if (data < hoje || doMes.some((linha) => !ehPrevistoFuturo(linha, hoje))) continue;
    const [atual, ...repetidas] = doMes;
    const linha = montarLinha(regra, data, atual?.id ?? novoId());
    if (!atual) plano.criar.push(linha);
    else if (mudou(linha, atual)) plano.atualizar.push(linha);
    plano.excluir.push(...repetidas.map((repetida) => repetida.id));
  }

  for (const linha of existentes) {
    if (ehPrevistoFuturo(linha, hoje) && !mesesDaRegra.has(mesDe(linha.data))) {
      plano.excluir.push(linha.id);
    }
  }
  return plano;
}

function montarLinha<R extends Recorrencia>(
  regra: R,
  data: DataISO,
  id: string,
): LinhaRecorrente<R> {
  const {
    id: recorrenciaId,
    dia: _dia,
    inicio: _inicio,
    fim: _fim,
    ativo: _ativo,
    ...campos
  } = regra;
  return { ...campos, id, recorrenciaId, data, status: 'previsto' };
}

function ehPrevistoFuturo(linha: LinhaExistente, hoje: DataISO): boolean {
  return linha.status === 'previsto' && linha.data >= hoje;
}

function mudou(linha: Readonly<Record<string, unknown>>, existente: LinhaExistente): boolean {
  return Object.keys(linha).some((campo) => linha[campo] !== existente[campo]);
}

function agruparPorMes(linhas: readonly LinhaExistente[]): Map<string, LinhaExistente[]> {
  const porMes = new Map<string, LinhaExistente[]>();
  const ordenadas = [...linhas].sort((a, b) => a.data.localeCompare(b.data));
  for (const linha of ordenadas) {
    const mes = mesDe(linha.data);
    porMes.set(mes, [...(porMes.get(mes) ?? []), linha]);
  }
  return porMes;
}

function maior(a: DataISO, b: DataISO): DataISO {
  return a > b ? a : b;
}
