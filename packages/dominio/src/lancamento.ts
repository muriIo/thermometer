import type { Centavos } from './centavos';
import type { DataISO } from './datas';

/** Valores fechados das colunas da aba Lançamentos (PROJECT.md, 5.1). */
export const TIPOS = ['entrada', 'saida', 'diario', 'estorno'] as const;
export type Tipo = (typeof TIPOS)[number];

export const MEIOS = ['avista', 'cartao'] as const;
export type Meio = (typeof MEIOS)[number];

export const STATUS = ['previsto', 'confirmado'] as const;
export type Status = (typeof STATUS)[number];

export const ESTORNA = ['diario', 'saida'] as const;
export type Estorna = (typeof ESTORNA)[number];

export const QUEM = ['Murilo', 'Thays', 'Nós dois'] as const;
export type Quem = (typeof QUEM)[number];

export const ORIGENS = ['app', 'planilha', 'recorrencia', 'migracao'] as const;

/**
 * Uma linha da aba Lançamentos nos campos de negócio. Campo opcional vazio é
 * `''` (ou `null` nos números), igual à célula vazia, para o hash não
 * distinguir "ausente" de "vazio".
 */
export type Lancamento = {
  readonly id: string;
  readonly data: DataISO;
  readonly valorCentavos: Centavos;
  readonly tipo: Tipo;
  readonly estorna: Estorna | '';
  readonly categoria: string;
  readonly descricao: string;
  readonly quem: Quem;
  readonly meio: Meio;
  readonly cartao: string;
  readonly status: Status;
  readonly grupoId: string;
  readonly parcelaN: number | null;
  readonly parcelas: number | null;
  readonly recorrenciaId: string;
  readonly excluido: boolean;
};
