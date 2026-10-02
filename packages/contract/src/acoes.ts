/**
 * Payloads e respostas de cada ação (PROJECT.md, 6.2). Os schemas validam a
 * forma; as regras entre campos vêm de `problemaNosCampos` do domínio.
 */
import {
  type Categoria,
  dataISO,
  ESCOPOS_DE_EXCLUSAO,
  ESTORNA,
  type Lancamento,
  MEIOS,
  problemaNosCampos,
  QUEM,
  STATUS,
  TIPOS,
} from '@termometro/dominio';
import { z } from 'zod';

const MAXIMO_PARCELAS = 120;

const data = z.string().refine((texto) => {
  try {
    dataISO(texto);
    return true;
  } catch {
    return false;
  }
}, 'data inválida, esperado YYYY-MM-DD');

const id = z.string().min(8).max(64);
const centavos = z.number().int().positive();

/** Campos de negócio editáveis; os mesmos de uma linha nova, menos parcelamento. */
const camposEditaveis = {
  data,
  valorCentavos: centavos,
  tipo: z.enum(TIPOS),
  estorna: z.enum(ESTORNA).optional(),
  categoria: z.string().optional(),
  descricao: z.string().optional(),
  quem: z.enum(QUEM),
  meio: z.enum(MEIOS),
  cartao: z.string().optional(),
  status: z.enum(STATUS),
};

type CamposOpcionais = {
  tipo?: string;
  estorna?: string | undefined;
  categoria?: string | undefined;
  descricao?: string | undefined;
  quem?: string;
  meio?: string;
  cartao?: string | undefined;
};

/** Aplica `problemaNosCampos` do domínio a um objeto já com a forma certa. */
function regrasDoDominio(campos: CamposOpcionais, contexto: z.RefinementCtx): void {
  const problema = problemaNosCampos({
    tipo: campos.tipo ?? '',
    estorna: campos.estorna ?? '',
    categoria: campos.categoria ?? '',
    descricao: campos.descricao ?? '',
    quem: campos.quem ?? '',
    meio: campos.meio ?? '',
    cartao: campos.cartao ?? '',
  });
  if (problema) contexto.addIssue({ code: 'custom', message: problema });
}

export const linhaNovaSchema = z
  .strictObject({
    id,
    ...camposEditaveis,
    grupoId: id.optional(),
    parcelaN: z.number().int().positive().optional(),
    parcelas: z.number().int().min(2).max(MAXIMO_PARCELAS).optional(),
  })
  .superRefine((linha, contexto) => {
    regrasDoDominio(linha, contexto);
    const grupo = [linha.grupoId, linha.parcelaN, linha.parcelas].filter((v) => v !== undefined);
    if (grupo.length !== 0 && grupo.length !== 3) {
      contexto.addIssue({ code: 'custom', message: 'grupoId, parcelaN e parcelas vão juntos' });
    }
    if (
      linha.parcelaN !== undefined &&
      linha.parcelas !== undefined &&
      linha.parcelaN > linha.parcelas
    ) {
      contexto.addIssue({ code: 'custom', message: 'parcelaN maior que parcelas' });
    }
  });
export type LinhaNova = z.infer<typeof linhaNovaSchema>;

const versaoVista = z.string().min(1).max(32);

export const PAYLOADS = {
  ping: z.null().optional(),
  referencias: z.null().optional(),
  lancar: z.strictObject({
    linhas: z.array(linhaNovaSchema).min(1).max(MAXIMO_PARCELAS),
  }),
  /** Campos ausentes não mudam. As regras do domínio valem sobre a linha já mesclada. */
  editar: z.strictObject({
    id,
    versaoVista,
    data: data.optional(),
    valorCentavos: centavos.optional(),
    tipo: camposEditaveis.tipo.optional(),
    estorna: z.enum([...ESTORNA, '']).optional(),
    categoria: z.string().optional(),
    descricao: z.string().optional(),
    quem: camposEditaveis.quem.optional(),
    meio: camposEditaveis.meio.optional(),
    cartao: z.string().optional(),
    status: camposEditaveis.status.optional(),
  }),
  excluir: z.strictObject({
    id,
    versaoVista,
    escopo: z.enum(ESCOPOS_DE_EXCLUSAO),
  }),
  listar: z.strictObject({ de: data, ate: data }),
  resumo: z.strictObject({ data }),
} as const;

export type Acao = keyof typeof PAYLOADS;
export const ACOES = Object.keys(PAYLOADS) as Acao[];
export type PayloadDe<A extends Acao> = z.infer<(typeof PAYLOADS)[A]>;

/** Lançamento como o script devolve: com a versão e as colunas de controle. */
export type LancamentoSalvo = Lancamento & {
  readonly versao: string;
  readonly origem: string;
  readonly registradoPor: string;
  /** ƒ da planilha; vazio até a fórmula calcular. */
  readonly faturaId: string;
  readonly dataCaixa: string;
};

export type RespostaReferencias = {
  readonly categorias: {
    readonly gasto: readonly Categoria[];
    readonly receita: readonly Categoria[];
  };
  readonly cartoes: readonly {
    readonly id: string;
    readonly nome: string;
    readonly dono: string;
  }[];
  readonly previsao: { readonly mes: string; readonly diarioPorDiaCentavos: number } | null;
  readonly limites: {
    readonly valorMaximoCentavos: number;
    readonly confirmarAcimaDiarioCentavos: number;
  };
};

export type RespostaLancar = { readonly linhas: readonly LancamentoSalvo[] };
export type RespostaEditar = { readonly linha: LancamentoSalvo };
export type RespostaExcluir = { readonly excluidos: readonly string[] };
export type RespostaListar = { readonly linhas: readonly LancamentoSalvo[] };

export type RespostaResumo = {
  readonly data: string;
  /** Lido da célula de Saldo (ADR 0007); `null` se o dia não tem bloco. */
  readonly saldoDoDiaCentavos: number | null;
  readonly menorSaldoDoMes: { readonly data: string; readonly saldoCentavos: number } | null;
  readonly diarioCaixaCentavos: number | null;
  readonly consumoDoDiarioCentavos: number;
  readonly previsaoCentavos: number | null;
  /** Do mês, pela data do lançamento (competência). */
  readonly totaisDoMes: Readonly<Record<'entrada' | 'saida' | 'diario' | 'estorno', number>>;
  readonly gastosPorCategoria: readonly { readonly categoria: string; readonly centavos: number }[];
  /** Células do mês, a partir do corte, que perderam a fórmula. */
  readonly celulasSemFormula: number;
};
