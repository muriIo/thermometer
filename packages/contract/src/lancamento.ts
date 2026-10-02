/**
 * Conversões entre o que viaja na API e o `Lancamento` do domínio. O script
 * grava com elas e o app projeta a fila com elas, então os dois lados
 * enxergam a mesma linha (docs/engenharia.md, seção 3).
 */
import { centavos, dataISO, type Lancamento } from '@termometro/dominio';
import type { LinhaNova, PayloadDe } from './acoes';

/** Campos de negócio de um `editar`, sem `id` e `versaoVista`. */
export type Edicao = Omit<PayloadDe<'editar'>, 'id' | 'versaoVista'>;

/** Linha nova como o `Lancamento` que ela vira na planilha; opcional ausente é a célula vazia. */
export function lancamentoDaLinhaNova(linha: LinhaNova): Lancamento {
  return {
    id: linha.id,
    data: dataISO(linha.data),
    valorCentavos: centavos(linha.valorCentavos),
    tipo: linha.tipo,
    estorna: linha.estorna ?? '',
    categoria: linha.categoria ?? '',
    descricao: linha.descricao ?? '',
    quem: linha.quem,
    meio: linha.meio,
    cartao: linha.cartao ?? '',
    status: linha.status,
    grupoId: linha.grupoId ?? '',
    parcelaN: linha.parcelaN ?? null,
    parcelas: linha.parcelas ?? null,
    recorrenciaId: '',
    excluido: false,
  };
}

/** Edição parcial (PROJECT.md, 6.2.1): campo ausente não muda; `estorna: ''` remove. */
export function aplicarEdicao<T extends Lancamento>(atual: T, edicao: Edicao): T {
  return {
    ...atual,
    ...(edicao.data === undefined ? {} : { data: dataISO(edicao.data) }),
    ...(edicao.valorCentavos === undefined
      ? {}
      : { valorCentavos: centavos(edicao.valorCentavos) }),
    ...(edicao.tipo === undefined ? {} : { tipo: edicao.tipo }),
    ...(edicao.estorna === undefined ? {} : { estorna: edicao.estorna }),
    ...(edicao.categoria === undefined ? {} : { categoria: edicao.categoria }),
    ...(edicao.descricao === undefined ? {} : { descricao: edicao.descricao }),
    ...(edicao.quem === undefined ? {} : { quem: edicao.quem }),
    ...(edicao.meio === undefined ? {} : { meio: edicao.meio }),
    ...(edicao.cartao === undefined ? {} : { cartao: edicao.cartao }),
    ...(edicao.status === undefined ? {} : { status: edicao.status }),
  };
}
