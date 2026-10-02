/**
 * lancar, editar, excluir e listar (PROJECT.md, 6.2). Rodam dentro do lock;
 * a idempotência é por `id` e o conflito, pela `versao` (ADR 0006).
 */
import {
  aplicarEdicao,
  falha,
  lancamentoDaLinhaNova,
  type PayloadDe,
  type Resposta,
  type RespostaEditar,
  type RespostaExcluir,
  type RespostaLancar,
  type RespostaListar,
  sucesso,
} from '@termometro/contract';
import { alcanceDaExclusao, type Lancamento, versao } from '@termometro/dominio';
import { type Contexto, cartoesAtivos, lerConfig, problemaParaGravar } from './api-contexto';
import { ABAS } from './esquema';
import { colunasDoLancamento, lancamentoSalvo, lerLancamento } from './lancamento-linha';
import type { Registro } from './tabela';

type Lido = { readonly registro: Registro; readonly lancamento: Lancamento };

function lerTodos(contexto: Contexto): Lido[] {
  const lidos: Lido[] = [];
  for (const registro of contexto.planilha.ler(ABAS.lancamentos).registros) {
    const lancamento = lerLancamento(registro.dados);
    if (lancamento) lidos.push({ registro, lancamento });
  }
  return lidos;
}

/**
 * Grava as linhas que ainda não existem. Reenvio da mesma linha (mesmo `id`)
 * devolve a que já está gravada, sem duplicar. Se alguma linha nova for
 * inválida, nada é gravado.
 */
export function lancar(payload: PayloadDe<'lancar'>, contexto: Contexto): Resposta<RespostaLancar> {
  const existentes = new Map(lerTodos(contexto).map((lido) => [lido.lancamento.id, lido]));
  const config = lerConfig(contexto.planilha);
  const cartoes = cartoesAtivos(contexto.planilha);
  const novas = new Map<string, Lancamento>();
  for (const [i, linha] of payload.linhas.entries()) {
    if (existentes.has(linha.id) || novas.has(linha.id)) continue;
    const lancamento = lancamentoDaLinhaNova(linha);
    const problema = problemaParaGravar(lancamento, contexto, config, cartoes);
    if (problema) return falha('INVALID_PAYLOAD', `Linha ${i + 1}: ${problema}`);
    novas.set(linha.id, lancamento);
  }

  const controle = {
    origem: 'app',
    registrado_por: contexto.nome,
    criado_em: contexto.agora,
    atualizado_em: contexto.agora,
  };
  contexto.planilha.acrescentar(
    ABAS.lancamentos,
    [...novas.values()].map((l) => ({ ...colunasDoLancamento(l), ...controle })),
  );

  const linhas = payload.linhas.map((linha) => {
    const existente = existentes.get(linha.id);
    if (existente) return lancamentoSalvo(existente.lancamento, existente.registro.dados);
    const nova = novas.get(linha.id) ?? lancamentoDaLinhaNova(linha);
    return lancamentoSalvo(nova, { ...controle, data_caixa: '', fatura_id: '' });
  });
  return sucesso({ linhas: dedupe(linhas) });
}

function dedupe<T extends { id: string }>(itens: readonly T[]): T[] {
  return [...new Map(itens.map((item) => [item.id, item])).values()];
}

/** Lançamento ativo com a versão que o app viu, ou a resposta de erro. */
function exigirVersao(id: string, versaoVista: string, contexto: Contexto): Lido | Resposta<never> {
  const lido = lerTodos(contexto).find((l) => l.lancamento.id === id);
  if (!lido || lido.lancamento.excluido)
    return falha('NOT_FOUND', `Lançamento ${id} não encontrado`);
  if (versao(lido.lancamento) !== versaoVista) {
    return falha('CONFLICT', 'O lançamento mudou desde que foi lido. Recarregue e tente de novo.');
  }
  return lido;
}

/** Edição parcial: campos ausentes não mudam. Confirmar um previsto é `status: 'confirmado'`. */
export function editar(payload: PayloadDe<'editar'>, contexto: Contexto): Resposta<RespostaEditar> {
  const { id, versaoVista, ...campos } = payload;
  const lido = exigirVersao(id, versaoVista, contexto);
  if ('ok' in lido) return lido;

  const editado = aplicarEdicao(lido.lancamento, campos);
  const problema = problemaParaGravar(
    editado,
    contexto,
    lerConfig(contexto.planilha),
    cartoesAtivos(contexto.planilha),
  );
  if (problema) return falha('INVALID_PAYLOAD', problema);

  const mudancas = { ...colunasDoLancamento(editado), atualizado_em: contexto.agora };
  contexto.planilha.atualizar(ABAS.lancamentos, lido.registro.linha, mudancas);
  return sucesso({ linha: lancamentoSalvo(editado, { ...lido.registro.dados, ...mudancas }) });
}

/**
 * Exclusão lógica do que `alcanceDaExclusao` alcança.
 */
export function excluir(
  payload: PayloadDe<'excluir'>,
  contexto: Contexto,
): Resposta<RespostaExcluir> {
  const lido = exigirVersao(payload.id, payload.versaoVista, contexto);
  if ('ok' in lido) return lido;

  const todos = payload.escopo === 'esta_e_proximas' ? lerTodos(contexto) : [];
  const ids = new Set(
    alcanceDaExclusao(
      lido.lancamento,
      todos.map((l) => l.lancamento),
      payload.escopo,
    ).map((l) => l.id),
  );
  const excluidos = [
    lido,
    ...todos.filter((l) => l.lancamento.id !== lido.lancamento.id && ids.has(l.lancamento.id)),
  ];
  for (const { registro } of excluidos) {
    contexto.planilha.atualizar(ABAS.lancamentos, registro.linha, {
      excluido: true,
      atualizado_em: contexto.agora,
    });
  }
  return sucesso({ excluidos: excluidos.map(({ lancamento }) => lancamento.id) });
}

/** Lançamentos não excluídos com `data` entre `de` e `ate`, inclusive, em ordem de data. */
export function listar(payload: PayloadDe<'listar'>, contexto: Contexto): Resposta<RespostaListar> {
  if (payload.de > payload.ate) return falha('INVALID_PAYLOAD', '"de" depois de "ate"');
  const linhas = lerTodos(contexto)
    .filter(({ lancamento: l }) => !l.excluido && l.data >= payload.de && l.data <= payload.ate)
    .sort((a, b) => a.lancamento.data.localeCompare(b.lancamento.data))
    .map(({ lancamento, registro }) => lancamentoSalvo(lancamento, registro.dados));
  return sucesso({ linhas });
}
