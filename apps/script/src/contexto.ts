// Auxiliares dos comandos de menu: lock, avisos, Config e anos com aba.
import { type DataISO, dataISO } from '@termometro/dominio';
import { ABAS } from './esquema';
import { aba, acrescentar, atualizar, ler, planilha } from './planilha';
import { podeEscrever } from './seguranca';
import { lerData, lerTexto } from './tabela';

const FUSO = 'America/Sao_Paulo';

/** Aba com os saldos fotografados antes das fórmulas (PROJECT.md, 9). */
export const ABA_VALIDACAO = 'Validação';

export function confirmar(pergunta: string): boolean {
  const ui = SpreadsheetApp.getUi();
  return ui.alert(pergunta, ui.ButtonSet.YES_NO) === ui.Button.YES;
}

export function comLock(acao: () => void): void {
  const permissao = PropertiesService.getScriptProperties().getProperty('PERMITIR_PLANILHA_REAL');
  if (!podeEscrever(planilha().getId(), permissao)) {
    avisar('Esta é a planilha real. A escrita está bloqueada até a virada da Fase 2.');
    return;
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(30_000);
  try {
    acao();
  } finally {
    lock.releaseLock();
  }
}

export function avisar(mensagem: string): void {
  SpreadsheetApp.getUi().alert(mensagem);
}

export function dataDeHoje(): DataISO {
  return dataISO(Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd'));
}

function config(chave: string): unknown {
  const linha = ler(ABAS.config).tabela.registros.find(
    ({ dados }) => lerTexto(dados.chave) === chave,
  );
  return linha?.dados.valor;
}

export function gravarConfig(chave: string, valor: DataISO): void {
  const lida = ler(ABAS.config);
  const linha = lida.tabela.registros.find(({ dados }) => lerTexto(dados.chave) === chave);
  if (linha) atualizar(ABAS.config, lida, linha.linha, { valor });
  else acrescentar(ABAS.config, [{ chave, valor }]);
}

export function dataDeCorte(): DataISO {
  const corte = lerData(config('data_corte'));
  if (!corte) throw new Error('Preencha Config!data_corte (um dia 24) antes.');
  // ADR 0008: o corte cai logo depois do fechamento do Inter.
  if (!corte.endsWith('-24'))
    throw new Error(`Config!data_corte precisa ser um dia 24; está ${corte}.`);
  return corte;
}

/** Anos com aba (2026, 2027…) que têm dias a partir do corte. */
export function anosAPartirDe(corte: DataISO): number[] {
  const anos: number[] = [];
  for (let ano = Number(corte.slice(0, 4)); aba(String(ano)); ano++) anos.push(ano);
  return anos;
}
