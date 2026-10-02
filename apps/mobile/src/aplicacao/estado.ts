import type { DataISO } from '@termometro/dominio';
import { type Guardado, NADA_GUARDADO } from './guardado.ts';

/**
 * Efeito de uma operação concluída depois do último `resumo`: o saldo e o
 * consumo lidos da planilha ainda não a incluem, então a estimativa soma.
 */
export type Ajuste = {
  readonly caixaCentavos: number;
  readonly consumoCentavos: number;
  readonly concluidoEm: number;
};

type Aviso = { readonly id: string; readonly texto: string };

/** Tudo o que a UI lê. Imutável: cada mudança gera um novo. */
export type Estado = Guardado & {
  /** `sem-token`: falta o primeiro acesso (tela 0). */
  readonly fase: 'carregando' | 'sem-token' | 'pronto';
  readonly hoje: DataISO;
  readonly online: boolean;
  readonly sincronizando: boolean;
  readonly emEnvio: string | null;
  /** A fila parou de vez: token recusado ou contrato que o script não aceita. */
  readonly bloqueio: 'token' | 'versao' | null;
  readonly ajustesDesdeResumo: readonly Ajuste[];
  readonly avisos: readonly Aviso[];
};

export function estadoInicial(hoje: DataISO): Estado {
  return {
    ...NADA_GUARDADO,
    fase: 'carregando',
    hoje,
    online: false,
    sincronizando: false,
    emEnvio: null,
    bloqueio: null,
    ajustesDesdeResumo: [],
    avisos: [],
  };
}
