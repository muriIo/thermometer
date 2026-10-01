/**
 * Abas novas da planilha (PROJECT.md, 5.1–5.2). A ordem das colunas é a da
 * criação; depois disso o script só acrescenta no fim e lê pelo cabeçalho.
 * Colunas calculadas (ƒ) são `ARRAYFORMULA` no cabeçalho: nunca recebem valor.
 */
export const ABAS = {
  lancamentos: 'Lançamentos',
  cartoes: 'Cartões',
  faturas: 'Faturas',
  recorrentes: 'Recorrentes',
  previsao: 'Previsão',
  config: 'Config',
} as const;

export type NomeAba = (typeof ABAS)[keyof typeof ABAS];

export type DefinicaoAba = {
  readonly nome: NomeAba;
  readonly colunas: readonly string[];
  readonly calculadas: readonly string[];
  /** Colunas com formato de texto puro, para "2026-10" não virar data. */
  readonly texto: readonly string[];
  /** Colunas com formato de data. */
  readonly datas: readonly string[];
  /** Linhas iniciais, só quando a aba é criada. */
  readonly linhasIniciais: readonly (readonly unknown[])[];
};

export const DEFINICOES: readonly DefinicaoAba[] = [
  {
    nome: ABAS.lancamentos,
    colunas: [
      'id',
      'data',
      'valor',
      'tipo',
      'estorna',
      'categoria',
      'descricao',
      'quem',
      'registrado_por',
      'meio',
      'cartao',
      'status',
      'grupo_id',
      'parcela_n',
      'parcelas',
      'recorrencia_id',
      'origem',
      'criado_em',
      'atualizado_em',
      'excluido',
      'fatura_id',
      'data_caixa',
    ],
    calculadas: ['fatura_id', 'data_caixa'],
    texto: ['id', 'descricao', 'grupo_id', 'recorrencia_id'],
    datas: ['data', 'data_caixa'],
    linhasIniciais: [],
  },
  {
    nome: ABAS.cartoes,
    colunas: ['id', 'nome', 'dono', 'fechamento', 'vencimento', 'limite', 'ativo'],
    calculadas: [],
    texto: ['id'],
    datas: [],
    linhasIniciais: [['INTER', 'Cartão Murilo (Inter)', 'Murilo', 24, 1, 6600, true]],
  },
  {
    nome: ABAS.faturas,
    colunas: ['id', 'cartao', 'fecha_em', 'vence_em', 'pago_em', 'data_efetiva', 'total', 'status'],
    calculadas: ['data_efetiva', 'total', 'status'],
    texto: ['id'],
    datas: ['fecha_em', 'vence_em', 'pago_em', 'data_efetiva'],
    linhasIniciais: [],
  },
  {
    nome: ABAS.recorrentes,
    colunas: [
      'id',
      'descricao',
      'tipo',
      'estorna',
      'valor',
      'categoria',
      'quem',
      'meio',
      'cartao',
      'dia',
      'inicio',
      'fim',
      'ativo',
    ],
    calculadas: [],
    texto: ['id', 'descricao'],
    datas: ['inicio', 'fim'],
    linhasIniciais: [],
  },
  {
    nome: ABAS.previsao,
    colunas: ['mes', 'diario_por_dia'],
    calculadas: [],
    texto: ['mes'],
    datas: [],
    linhasIniciais: [],
  },
  {
    nome: ABAS.config,
    colunas: ['chave', 'valor'],
    calculadas: [],
    texto: ['chave'],
    datas: [],
    linhasIniciais: [
      ['valor_maximo', 20000],
      ['confirmar_acima_diario', 2000],
      ['horizonte', ''],
      ['data_corte', ''],
    ],
  },
];

export type AjusteDeAba =
  | { readonly tipo: 'criar'; readonly definicao: DefinicaoAba }
  | { readonly tipo: 'acrescentar'; readonly definicao: DefinicaoAba; readonly colunas: string[] };

/**
 * O que falta para a planilha ter as abas e colunas do modelo. Recebe o
 * cabeçalho atual de cada aba (`null` = aba não existe). Nunca remove nem
 * reordena: coluna que sobra é ignorada.
 */
export function planejarEstrutura(
  cabecalhos: (nome: NomeAba) => readonly string[] | null,
): AjusteDeAba[] {
  const ajustes: AjusteDeAba[] = [];
  for (const definicao of DEFINICOES) {
    const atual = cabecalhos(definicao.nome);
    if (atual === null) {
      ajustes.push({ tipo: 'criar', definicao });
      continue;
    }
    const faltando = definicao.colunas.filter((coluna) => !atual.includes(coluna));
    if (faltando.length > 0) ajustes.push({ tipo: 'acrescentar', definicao, colunas: faltando });
  }
  return ajustes;
}

export function definicao(nome: NomeAba): DefinicaoAba {
  const encontrada = DEFINICOES.find((d) => d.nome === nome);
  if (!encontrada) throw new Error(`Aba sem definição: ${nome}`);
  return encontrada;
}
