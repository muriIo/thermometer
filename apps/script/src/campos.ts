import type { CamposDeNegocio } from '@termometro/dominio';
import { lerTexto } from './tabela';

/** Colunas de negócio de uma linha lida (Lançamentos, Recorrentes, Migração). */
export function lerCampos(dados: Readonly<Record<string, unknown>>): CamposDeNegocio {
  return {
    descricao: lerTexto(dados.descricao),
    tipo: lerTexto(dados.tipo),
    estorna: lerTexto(dados.estorna),
    categoria: lerTexto(dados.categoria),
    quem: lerTexto(dados.quem),
    meio: lerTexto(dados.meio) || 'avista',
    cartao: lerTexto(dados.cartao),
  };
}
