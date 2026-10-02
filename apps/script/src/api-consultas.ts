/** referencias e resumo (PROJECT.md, 6.2). Só leitura. */
import {
  type PayloadDe,
  type Resposta,
  type RespostaReferencias,
  type RespostaResumo,
  sucesso,
} from '@termometro/contract';
import {
  CATEGORIAS_GASTO,
  CATEGORIAS_RECEITA,
  consumoDoDiario,
  type DataISO,
  dataISO,
  deReais,
  diasNoMes,
  type Lancamento,
  mesDe,
} from '@termometro/dominio';
import { type Contexto, lerConfig } from './api-contexto';
import { ABAS } from './esquema';
import { lerLancamento } from './lancamento-linha';
import type { Bloco } from './porta';
import { lerBooleano, lerTexto } from './tabela';

export function referencias(contexto: Contexto): Resposta<RespostaReferencias> {
  const config = lerConfig(contexto.planilha);
  const cartoes = contexto.planilha
    .ler(ABAS.cartoes)
    .registros.filter(({ dados }) => lerTexto(dados.ativo) === '' || lerBooleano(dados.ativo))
    .map(({ dados }) => ({
      id: lerTexto(dados.id),
      nome: lerTexto(dados.nome),
      dono: lerTexto(dados.dono),
    }))
    .filter((cartao) => cartao.id);
  const mes = mesDe(contexto.hoje);
  const previsao = previsaoDoMes(contexto, mes);
  return sucesso({
    categorias: { gasto: CATEGORIAS_GASTO, receita: CATEGORIAS_RECEITA },
    cartoes,
    previsao: previsao === null ? null : { mes, diarioPorDiaCentavos: previsao },
    limites: {
      valorMaximoCentavos: config.valorMaximoCentavos,
      confirmarAcimaDiarioCentavos: config.confirmarAcimaDiarioCentavos,
    },
  });
}

function previsaoDoMes(contexto: Contexto, mes: string): number | null {
  const linha = contexto.planilha
    .ler(ABAS.previsao)
    .registros.find(({ dados }) => lerTexto(dados.mes) === mes);
  const valor = Number(linha?.dados.diario_por_dia);
  return linha && Number.isFinite(valor) ? deReais(valor) : null;
}

// Colunas do bloco, a partir de Data (PROJECT.md, 3.1).
const COLUNA = { entrada: 1, saida: 2, diario: 3, saldo: 4 } as const;

/**
 * Resumo de um dia. Saldo e Diário (caixa) vêm das células da planilha
 * (ADR 0007); consumo, totais e categorias, dos lançamentos.
 */
export function resumo(payload: PayloadDe<'resumo'>, contexto: Contexto): Resposta<RespostaResumo> {
  const data = dataISO(payload.data);
  const [ano, mes, dia] = [
    Number(data.slice(0, 4)),
    Number(data.slice(5, 7)),
    Number(data.slice(8)),
  ];
  const bloco = contexto.planilha.bloco(ano, mes);
  const lancamentos = contexto.planilha
    .ler(ABAS.lancamentos)
    .registros.map(({ dados }) => lerLancamento(dados))
    .filter((l): l is Lancamento => l !== null && !l.excluido);
  const doMes = lancamentos.filter((l) => mesDe(l.data) === mesDe(data));
  const corte = lerConfig(contexto.planilha).dataCorte;

  return sucesso({
    data,
    saldoDoDiaCentavos: celula(bloco, dia, COLUNA.saldo),
    menorSaldoDoMes: menorSaldo(bloco, ano, mes),
    diarioCaixaCentavos: celula(bloco, dia, COLUNA.diario),
    consumoDoDiarioCentavos: consumoDoDiario(lancamentos, data),
    previsaoCentavos: previsaoDoMes(contexto, mesDe(data)),
    totaisDoMes: totaisPorTipo(doMes),
    gastosPorCategoria: gastosPorCategoria(doMes),
    celulasSemFormula: bloco && corte ? semFormula(bloco, ano, mes, corte) : 0,
  });
}

function celula(bloco: Bloco | null, dia: number, coluna: number): number | null {
  const valor = bloco?.valores[dia - 1]?.[coluna];
  return valor === '' || valor === undefined || valor === null || !Number.isFinite(Number(valor))
    ? null
    : deReais(Number(valor));
}

function menorSaldo(
  bloco: Bloco | null,
  ano: number,
  mes: number,
): RespostaResumo['menorSaldoDoMes'] {
  let menor: RespostaResumo['menorSaldoDoMes'] = null;
  for (let dia = 1; dia <= diasNoMes(ano, mes); dia++) {
    const saldo = celula(bloco, dia, COLUNA.saldo);
    if (saldo !== null && (menor === null || saldo < menor.saldoCentavos)) {
      menor = { data: dataDoDia(ano, mes, dia), saldoCentavos: saldo };
    }
  }
  return menor;
}

function dataDoDia(ano: number, mes: number, dia: number): DataISO {
  return dataISO(`${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`);
}

function totaisPorTipo(lancamentos: readonly Lancamento[]): RespostaResumo['totaisDoMes'] {
  const totais = { entrada: 0, saida: 0, diario: 0, estorno: 0 };
  for (const l of lancamentos) totais[l.tipo] += l.valorCentavos;
  return totais;
}

/** Gastos (Diário + Saída − estornos) por categoria, do maior para o menor. */
function gastosPorCategoria(
  lancamentos: readonly Lancamento[],
): RespostaResumo['gastosPorCategoria'] {
  const porCategoria = new Map<string, number>();
  for (const l of lancamentos) {
    if (l.tipo === 'entrada') continue;
    const sinal = l.tipo === 'estorno' ? -1 : 1;
    const categoria = l.categoria || 'Sem categoria';
    porCategoria.set(categoria, (porCategoria.get(categoria) ?? 0) + sinal * l.valorCentavos);
  }
  return [...porCategoria]
    .map(([categoria, total]) => ({ categoria, centavos: total }))
    .sort((a, b) => b.centavos - a.centavos);
}

/** Células de Entrada/Saída/Diário do mês, a partir do corte, sem fórmula (PROJECT.md, 5.4). */
function semFormula(bloco: Bloco, ano: number, mes: number, corte: DataISO): number {
  let faltando = 0;
  for (let dia = 1; dia <= diasNoMes(ano, mes); dia++) {
    if (dataDoDia(ano, mes, dia) < corte) continue;
    for (const coluna of [COLUNA.entrada, COLUNA.saida, COLUNA.diario]) {
      if (!bloco.formulas[dia - 1]?.[coluna]) faltando++;
    }
  }
  return faltando;
}
