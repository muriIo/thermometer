// Comandos do menu "Termômetro" (PROJECT.md, 7). Orquestram I/O; a lógica é testada à parte.
import { type DataISO, dataISO, horizonte } from '@termometro/dominio';
import { ABAS, definicao, planejarEstrutura } from './esquema';
import {
  celulasDoDia,
  type DiaDoBloco,
  diasDoAnoAPartirDe,
  formulaCalculada,
  formulasDoDia,
  type Letras,
} from './formulas';
import { planejarGeracao } from './gerar';
import {
  aba,
  abaObrigatoria,
  acrescentar,
  acrescentarColunas,
  atualizar,
  cabecalho,
  criarAba,
  ler,
  letrasAtuais,
  planilha,
  proteger,
  removerProtecoes,
  TODAS_AS_ABAS,
} from './planilha';
import { podeEscrever } from './seguranca';
import { lerData, lerTexto, letraDaColuna } from './tabela';
import { conferirFaturaIds, conferirFormula, type Divergencia } from './verificar';

const FUSO = 'America/Sao_Paulo';
const MAXIMO_NO_ALERTA = 30;

export function criarMenu(): void {
  SpreadsheetApp.getUi()
    .createMenu('Termômetro')
    .addItem('Preparar abas', 'prepararAbas')
    .addItem('Gerar recorrências e faturas', 'gerarRecorrenciasEFaturas')
    .addItem('Aplicar fórmulas a partir do corte', 'aplicarFormulas')
    .addItem('Verificar fórmulas', 'verificarFormulas')
    .addToUi();
}

/** Cria as abas e colunas que faltam e (re)grava as fórmulas ƒ protegidas. */
export function prepararAbas(): void {
  comLock(() => {
    for (const ajuste of planejarEstrutura(cabecalho)) {
      if (ajuste.tipo === 'criar') criarAba(ajuste.definicao.nome);
      else acrescentarColunas(ajuste.definicao.nome, ajuste.colunas);
    }
    const letras = letrasAtuais();
    for (const nome of TODAS_AS_ABAS) {
      const def = definicao(nome);
      const destino = abaObrigatoria(nome);
      removerProtecoes(destino);
      for (const coluna of def.calculadas) {
        const indice = (cabecalho(nome) ?? []).indexOf(coluna) + 1;
        destino.getRange(1, indice).setFormula(formulaCalculada(nome, coluna, letras));
        proteger(destino.getRange(1, indice, destino.getMaxRows(), 1));
      }
    }
    avisar('Abas prontas.');
  });
}

export function gerarRecorrenciasEFaturas(): void {
  comLock(() => {
    const hoje = dataDeHoje();
    const ate = horizonte(hoje);
    const lancamentos = ler(ABAS.lancamentos);
    const recorrentes = ler(ABAS.recorrentes);
    const plano = planejarGeracao(
      {
        lancamentos: lancamentos.tabela,
        recorrentes: recorrentes.tabela,
        cartoes: ler(ABAS.cartoes).tabela,
        faturas: ler(ABAS.faturas).tabela,
      },
      hoje,
      ate,
      new Date(),
      () => Utilities.getUuid(),
    );
    for (const { linha, id } of plano.regrasSemId) {
      atualizar(ABAS.recorrentes, recorrentes, linha, { id });
    }
    for (const { linha, campos } of plano.lancamentosAlterados) {
      atualizar(ABAS.lancamentos, lancamentos, linha, campos);
    }
    acrescentar(ABAS.lancamentos, plano.lancamentosNovos);
    acrescentar(ABAS.faturas, plano.faturasNovas);
    gravarConfig('horizonte', ate);
    avisar(
      [
        `Até ${ate}: ${plano.lancamentosNovos.length} lançamentos novos, ` +
          `${plano.lancamentosAlterados.length} alterados, ${plano.faturasNovas.length} faturas novas.`,
        ...plano.avisos,
      ].join('\n'),
    );
  });
}

/** Entrada/Saída/Diário viram fórmulas do corte em diante, protegidas com aviso. */
export function aplicarFormulas(): void {
  comLock(() => {
    const corte = dataDeCorte();
    const letras = letrasAtuais();
    for (const ano of anosAPartirDe(corte)) {
      const destino = abaObrigatoria(String(ano));
      removerProtecoes(destino);
      for (const [mes, dias] of porMes(diasDoAnoAPartirDe(ano, corte))) {
        const primeira = dias[0];
        if (!primeira) continue;
        const formulas = dias.map(({ data }) => {
          if (!data) return ['', '', ''];
          const doDia = formulasDoDia(data, letras);
          return [doDia.entrada, doDia.saida, doDia.diario];
        });
        const intervalo = destino.getRange(
          primeira.celulas.linha,
          celulasDoDia(ano, mes, 1).entrada,
          dias.length,
          3,
        );
        intervalo.clearContent().setFormulas(formulas);
        proteger(intervalo);
      }
    }
    avisar(`Fórmulas aplicadas a partir de ${corte}.`);
  });
}

export function verificarFormulas(): void {
  const corte = dataDeCorte();
  const letras = letrasAtuais();
  const divergencias = [
    ...verificarCalculadas(letras),
    ...anosAPartirDe(corte).flatMap((ano) => verificarBlocos(ano, corte, letras)),
    ...conferirFaturaIds(ler(ABAS.lancamentos).tabela, ler(ABAS.cartoes).tabela),
  ];
  avisar(
    divergencias.length === 0
      ? 'Tudo certo: fórmulas íntegras e fatura_id igual ao domínio.'
      : [
          `${divergencias.length} problema(s):`,
          ...divergencias.slice(0, MAXIMO_NO_ALERTA).map((d) => `${d.onde}: ${d.problema}`),
        ].join('\n'),
  );
}

function verificarCalculadas(letras: Letras): Divergencia[] {
  const divergencias: Divergencia[] = [];
  for (const nome of TODAS_AS_ABAS) {
    const colunas = cabecalho(nome) ?? [];
    for (const coluna of definicao(nome).calculadas) {
      const indice = colunas.indexOf(coluna) + 1;
      const atual = indice > 0 ? abaObrigatoria(nome).getRange(1, indice).getFormula() : '';
      const esperada = formulaCalculada(nome, coluna, letras);
      divergencias.push(...conferirFormula(`${nome}!${coluna}`, esperada, atual));
    }
  }
  return divergencias;
}

const VAZIAS = { entrada: '', saida: '', diario: '' } as const;

function verificarBlocos(ano: number, corte: DataISO, letras: Letras): Divergencia[] {
  const formulas = abaObrigatoria(String(ano))
    .getRange(1, 1, 33, 6 * 12)
    .getFormulas();
  const divergencias: Divergencia[] = [];
  for (const { celulas, data } of diasDoAnoAPartirDe(ano, corte)) {
    const esperadas = data ? formulasDoDia(data, letras) : VAZIAS;
    const linha = formulas[celulas.linha - 1] ?? [];
    for (const coluna of ['entrada', 'saida', 'diario'] as const) {
      const onde = `${ano}!${letraDaColuna(celulas[coluna] - 1)}${celulas.linha}`;
      divergencias.push(
        ...conferirFormula(onde, esperadas[coluna], linha[celulas[coluna] - 1] ?? ''),
      );
    }
  }
  return divergencias;
}

function comLock(acao: () => void): void {
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

function avisar(mensagem: string): void {
  SpreadsheetApp.getUi().alert(mensagem);
}

function dataDeHoje(): DataISO {
  return dataISO(Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd'));
}

function config(chave: string): unknown {
  const linha = ler(ABAS.config).tabela.registros.find(
    ({ dados }) => lerTexto(dados.chave) === chave,
  );
  return linha?.dados.valor;
}

function gravarConfig(chave: string, valor: DataISO): void {
  const lida = ler(ABAS.config);
  const linha = lida.tabela.registros.find(({ dados }) => lerTexto(dados.chave) === chave);
  if (linha) atualizar(ABAS.config, lida, linha.linha, { valor });
  else acrescentar(ABAS.config, [{ chave, valor }]);
}

function dataDeCorte(): DataISO {
  const corte = lerData(config('data_corte'));
  if (!corte) throw new Error('Preencha Config!data_corte (um dia 24) antes.');
  return corte;
}

/** Anos com aba (2026, 2027…) que têm dias a partir do corte. */
function anosAPartirDe(corte: DataISO): number[] {
  const anos: number[] = [];
  for (let ano = Number(corte.slice(0, 4)); aba(String(ano)); ano++) anos.push(ano);
  return anos;
}

function porMes(dias: readonly DiaDoBloco[]): Map<number, DiaDoBloco[]> {
  const grupos = new Map<number, DiaDoBloco[]>();
  for (const dia of dias)
    grupos.set(dia.celulas.mes, [...(grupos.get(dia.celulas.mes) ?? []), dia]);
  return grupos;
}
