/**
 * O que a tela mostra: o espelho da planilha com a fila aplicada por cima.
 * Como o espelho nunca recebe nada pendente, "a planilha sempre vence"
 * (PROJECT.md, 8.4) é só trocar o espelho; o que ainda está na fila
 * reaparece aqui.
 */
import { aplicarEdicao, type LancamentoSalvo, lancamentoDaLinhaNova } from '@termometro/contract';
import { alcanceDaExclusao, type Lancamento } from '@termometro/dominio';
import { emOrdem, type Operacao } from './operacao.ts';

type Situacao = 'sincronizado' | 'pendente' | 'enviando' | 'travado';

export type LancamentoNaTela = Lancamento & {
  readonly situacao: Situacao;
  /** Versão que a planilha devolveu; nula enquanto o lançamento só existe na fila. */
  readonly versao: string | null;
};

export function projetar(
  espelho: readonly LancamentoSalvo[],
  fila: readonly Operacao[],
  emEnvio: string | null,
): LancamentoNaTela[] {
  const linhas = new Map<string, LancamentoNaTela>();
  for (const salvo of espelho) {
    linhas.set(salvo.id, { ...semControle(salvo), situacao: 'sincronizado', versao: salvo.versao });
  }
  for (const operacao of emOrdem(fila)) {
    const situacao = situacaoDa(operacao, emEnvio);
    aplicar(linhas, operacao, situacao);
  }
  return [...linhas.values()];
}

function aplicar(
  linhas: Map<string, LancamentoNaTela>,
  operacao: Operacao,
  situacao: Situacao,
): void {
  if (operacao.acao === 'lancar') {
    for (const linha of operacao.linhas) {
      const versao = linhas.get(linha.id)?.versao ?? null;
      linhas.set(linha.id, { ...lancamentoDaLinhaNova(linha), situacao, versao });
    }
    return;
  }
  const atual = linhas.get(operacao.id);
  if (!atual) return;
  if (operacao.acao === 'editar') {
    linhas.set(operacao.id, { ...aplicarEdicao(atual, operacao.edicao), situacao });
    return;
  }
  for (const excluido of alcanceDaExclusao(atual, [...linhas.values()], operacao.escopo)) {
    linhas.delete(excluido.id);
  }
}

function situacaoDa(operacao: Operacao, emEnvio: string | null): Situacao {
  if (operacao.travada) return 'travado';
  return operacao.opId === emEnvio ? 'enviando' : 'pendente';
}

/** Só os campos de negócio; o controle da planilha não vai para a tela. */
function semControle(salvo: LancamentoSalvo): Lancamento {
  const {
    versao: _v,
    origem: _o,
    registradoPor: _r,
    faturaId: _f,
    dataCaixa: _d,
    ...lancamento
  } = salvo;
  return lancamento;
}
