/** Valores fechados das colunas da aba Lançamentos (PROJECT.md, 5.1). */
export const TIPOS = ['entrada', 'saida', 'diario', 'estorno'] as const;
export type Tipo = (typeof TIPOS)[number];

export const MEIOS = ['avista', 'cartao'] as const;
export type Meio = (typeof MEIOS)[number];

export const STATUS = ['previsto', 'confirmado'] as const;
export type Status = (typeof STATUS)[number];

export const ESTORNA = ['diario', 'saida'] as const;

export const QUEM = ['Murilo', 'Thays', 'Nós dois'] as const;
export type Quem = (typeof QUEM)[number];

export const ORIGENS = ['app', 'planilha', 'recorrencia', 'migracao'] as const;
