/** Linha da aba Lançamentos ↔ `Lancamento` do domínio. */
import type { LancamentoSalvo } from '@termometro/contract';
import {
  deReais,
  ESTORNA,
  type Estorna,
  type Lancamento,
  MEIOS,
  type Meio,
  paraReais,
  QUEM,
  type Quem,
  STATUS,
  type Status,
  TIPOS,
  type Tipo,
  versao,
} from '@termometro/dominio';
import { escreverData, lerBooleano, lerData, lerTexto } from './tabela';

type Dados = Readonly<Record<string, unknown>>;

function daLista<T extends string>(lista: readonly T[], valor: string): T | null {
  return (lista as readonly string[]).includes(valor) ? (valor as T) : null;
}

function numeroOuNulo(valor: unknown): number | null {
  const numero = Number(valor);
  return valor === '' || valor === null || valor === undefined || !Number.isFinite(numero)
    ? null
    : numero;
}

/** `null` se a linha não tem o mínimo para ser um lançamento (id, data, tipo…). */
export function lerLancamento(dados: Dados): Lancamento | null {
  const id = lerTexto(dados.id);
  const data = lerData(dados.data);
  const tipo = daLista<Tipo>(TIPOS, lerTexto(dados.tipo));
  const meio = daLista<Meio>(MEIOS, lerTexto(dados.meio) || 'avista');
  const status = daLista<Status>(STATUS, lerTexto(dados.status) || 'confirmado');
  const quem = daLista<Quem>(QUEM, lerTexto(dados.quem) || 'Nós dois');
  const valor = Number(dados.valor);
  if (!id || !data || !tipo || !meio || !status || !quem || !Number.isFinite(valor)) return null;
  return {
    id,
    data,
    valorCentavos: deReais(valor),
    tipo,
    estorna: daLista<Estorna>(ESTORNA, lerTexto(dados.estorna)) ?? '',
    categoria: lerTexto(dados.categoria),
    descricao: lerTexto(dados.descricao),
    quem,
    meio,
    cartao: lerTexto(dados.cartao),
    status,
    grupoId: lerTexto(dados.grupo_id),
    parcelaN: numeroOuNulo(dados.parcela_n),
    parcelas: numeroOuNulo(dados.parcelas),
    recorrenciaId: lerTexto(dados.recorrencia_id),
    excluido: lerBooleano(dados.excluido),
  };
}

/** Texto do app que começa com `=`, `+`, `-` ou `@` é gravado como texto puro (PROJECT.md, 7). */
function textoSeguro(texto: string): string {
  return /^[=+\-@]/.test(texto) ? `'${texto}` : texto;
}

/** Colunas de negócio de um lançamento, prontas para escrever. */
export function colunasDoLancamento(l: Lancamento): Record<string, unknown> {
  return {
    id: l.id,
    data: escreverData(l.data),
    valor: paraReais(l.valorCentavos),
    tipo: l.tipo,
    estorna: l.estorna,
    categoria: l.categoria,
    descricao: textoSeguro(l.descricao),
    quem: l.quem,
    meio: l.meio,
    cartao: l.cartao,
    status: l.status,
    grupo_id: l.grupoId,
    parcela_n: l.parcelaN ?? '',
    parcelas: l.parcelas ?? '',
    recorrencia_id: l.recorrenciaId,
    excluido: l.excluido,
  };
}

/** O lançamento como a API devolve, com a versão e as colunas de controle da linha. */
export function lancamentoSalvo(l: Lancamento, dados: Dados): LancamentoSalvo {
  return {
    ...l,
    versao: versao(l),
    origem: lerTexto(dados.origem),
    registradoPor: lerTexto(dados.registrado_por),
    faturaId: lerTexto(dados.fatura_id),
    dataCaixa: lerData(dados.data_caixa) ?? '',
  };
}
