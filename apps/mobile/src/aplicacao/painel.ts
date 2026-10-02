/**
 * Os números da tela Hoje (PROJECT.md, seção 10, tela 1). O saldo é sempre o
 * lido da planilha (ADR 0007); quando há algo que a leitura ainda não inclui
 * (pendentes, concluídos depois do resumo, resumo de outro dia, sem rede), o
 * app soma o efeito disso e marca "estimado" (PROJECT.md, 8.4, passo 5).
 */
import {
  aConfirmar,
  consumoDoDiario,
  type DataISO,
  efeitoNoCaixa,
  type Lancamento,
  mesDe,
} from '@termometro/dominio';
import type { Estado } from './estado.ts';
import { type LancamentoNaTela, projetar } from './projecao.ts';

export type PainelDeHoje = {
  readonly consumoCentavos: number;
  readonly previsaoCentavos: number | null;
  readonly passouDaPrevisao: boolean;
  readonly saldo: { readonly centavos: number; readonly estimado: boolean } | null;
  readonly menorSaldoDoMes: { readonly data: string; readonly saldoCentavos: number } | null;
  readonly aConfirmar: readonly LancamentoNaTela[];
  /** Lançamentos confirmados de hoje, inclusive os ainda na fila. */
  readonly deHoje: readonly LancamentoNaTela[];
  readonly pendentes: number;
};

export function painelDeHoje(estado: Estado): PainelDeHoje {
  const { hoje, espelho } = estado;
  const projetados = projetar(espelho, estado.fila, estado.emEnvio);
  const pendente = diferenca(medir(projetados, hoje), medir(espelho, hoje));
  const ajuste = estado.ajustesDesdeResumo.reduce(
    (soma, a) => ({
      caixa: soma.caixa + a.caixaCentavos,
      consumo: soma.consumo + a.consumoCentavos,
    }),
    { caixa: 0, consumo: 0 },
  );
  const base = baseDaPlanilha(estado);
  const consumoCentavos = base.consumo + ajuste.consumo + pendente.consumo;
  const previsaoCentavos = previsao(estado);
  const estimado =
    !estado.online ||
    estado.fila.length > 0 ||
    estado.ajustesDesdeResumo.length > 0 ||
    !base.deHoje;

  return {
    consumoCentavos,
    previsaoCentavos,
    passouDaPrevisao: previsaoCentavos !== null && consumoCentavos > previsaoCentavos,
    saldo:
      base.saldo === null
        ? null
        : { centavos: base.saldo + ajuste.caixa + pendente.caixa, estimado },
    menorSaldoDoMes: resumoDoMes(estado)?.menorSaldoDoMes ?? null,
    aConfirmar: aConfirmar(projetados, hoje),
    deHoje: projetados.filter((l) => l.data === hoje && l.status === 'confirmado'),
    pendentes: estado.fila.length,
  };
}

type Medida = { readonly caixa: number; readonly consumo: number };

/** Caixa acumulado até hoje e consumo do Diário de hoje, para comparar duas listas. */
export function medir(lancamentos: readonly Lancamento[], hoje: DataISO): Medida {
  const caixa = lancamentos
    .filter((l) => l.data <= hoje)
    .reduce((soma, l) => soma + efeitoNoCaixa(l), 0);
  return { caixa, consumo: consumoDoDiario(lancamentos, hoje) };
}

export function diferenca(depois: Medida, antes: Medida): Medida {
  return { caixa: depois.caixa - antes.caixa, consumo: depois.consumo - antes.consumo };
}

/** Saldo e consumo de hoje a partir do último resumo, ou do espelho quando ele não serve. */
function baseDaPlanilha(estado: Estado): {
  saldo: number | null;
  consumo: number;
  deHoje: boolean;
} {
  const { hoje, espelho } = estado;
  const resumo = estado.resumo?.resumo;
  if (resumo?.data === hoje) {
    return {
      saldo: resumo.saldoDoDiaCentavos,
      consumo: resumo.consumoDoDiarioCentavos,
      deHoje: true,
    };
  }
  const consumo = consumoDoDiario(espelho, hoje);
  if (!resumo || resumo.saldoDoDiaCentavos === null || resumo.data > hoje) {
    return { saldo: null, consumo, deHoje: false };
  }
  const desde = resumo.data;
  const caixaDesde = espelho
    .filter((l) => l.data > desde && l.data <= hoje)
    .reduce((soma, l) => soma + efeitoNoCaixa(l), 0);
  return { saldo: resumo.saldoDoDiaCentavos + caixaDesde, consumo, deHoje: false };
}

function resumoDoMes(estado: Estado) {
  const resumo = estado.resumo?.resumo;
  return resumo && resumo.data.slice(0, 7) === mesDe(estado.hoje) ? resumo : null;
}

function previsao(estado: Estado): number | null {
  const resumo = estado.resumo?.resumo;
  if (resumo?.data === estado.hoje && resumo.previsaoCentavos !== null)
    return resumo.previsaoCentavos;
  const doMes = estado.referencias?.previsao;
  return doMes?.mes === mesDe(estado.hoje) ? doMes.diarioPorDiaCentavos : null;
}
