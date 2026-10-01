/** Valores das colunas `meio` e `status` da aba Lançamentos (PROJECT.md, 5.1). */
export const MEIOS = ['avista', 'cartao'] as const;
export type Meio = (typeof MEIOS)[number];

export const STATUS = ['previsto', 'confirmado'] as const;
export type Status = (typeof STATUS)[number];
