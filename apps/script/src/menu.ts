// Comandos do menu "Termômetro" (PROJECT.md, 7). Orquestram I/O; a lógica é testada à parte.
import type { DataISO } from '@termometro/dominio';
import { anosComAba, fimDaGeracao } from './ano';
import {
  ABA_VALIDACAO,
  anosAPartirDe,
  avisar,
  comLock,
  confirmar,
  dataDeCorte,
  dataDeHoje,
  gravarConfig,
} from './contexto';
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
  aplicarValidacoes,
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
import { localizarFormula, separadorDaLocalidade } from './sintaxe';
import { letraDaColuna } from './tabela';
import { conferirFaturaIds, conferirFormula, type Divergencia } from './verificar';

const MAXIMO_NO_ALERTA = 30;

/** Fórmula en-US → sintaxe da localidade desta planilha (ver sintaxe.ts). */
export function local(formula: string): string {
  return localizarFormula(formula, separadorDaLocalidade(planilha().getSpreadsheetLocale()));
}

export function criarMenu(): void {
  SpreadsheetApp.getUi()
    .createMenu('Termômetro')
    .addItem('Preparar abas', 'prepararAbas')
    .addItem('Gerar recorrências e faturas', 'gerarRecorrenciasEFaturas')
    .addItem('Aplicar fórmulas a partir do corte', 'aplicarFormulas')
    .addItem('Verificar fórmulas', 'verificarFormulas')
    .addItem('Criar aba do próximo ano', 'criarAbaDoProximoAno')
    .addItem('Parcelar linha selecionada', 'parcelarLinhaSelecionada')
    .addSeparator()
    .addItem('Migração: registrar saldos atuais', 'registrarSaldos')
    .addItem('Migração: gerar aba Migração', 'gerarAbaMigracao')
    .addItem('Migração: importar aba Migração', 'importarMigracao')
    .addItem('Migração: relatório de validação', 'relatorioValidacao')
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
        destino.getRange(1, indice).setFormula(local(formulaCalculada(nome, coluna, letras)));
        proteger(destino.getRange(1, indice, destino.getMaxRows(), 1));
      }
      aplicarValidacoes(nome);
    }
    avisar('Abas prontas.');
  });
}

export function gerarRecorrenciasEFaturas(): void {
  comLock(() => avisar(executarGeracao()));
}

/**
 * Gera recorrências e faturas até o fim do horizonte ou do último ano com
 * aba, o que vier depois. Chamar dentro do lock. Devolve o resumo.
 */
export function executarGeracao(): string {
  const hoje = dataDeHoje();
  const ate = fimDaGeracao(
    hoje,
    anosComAba(
      planilha()
        .getSheets()
        .map((aba) => aba.getName()),
    ),
  );
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
  return [
    `Até ${ate}: ${plano.lancamentosNovos.length} lançamentos novos, ` +
      `${plano.lancamentosAlterados.length} alterados, ${plano.faturasNovas.length} faturas novas.`,
    ...plano.avisos,
  ].join('\n');
}

/** Entrada/Saída/Diário viram fórmulas do corte em diante, protegidas com aviso. */
export function aplicarFormulas(): void {
  comLock(() => {
    const corte = dataDeCorte();
    const saldosRegistrados = (aba(ABA_VALIDACAO)?.getLastRow() ?? 0) > 1;
    if (
      !saldosRegistrados &&
      !confirmar(
        `Os saldos ainda não foram registrados (aba ${ABA_VALIDACAO}). Depois das fórmulas, ` +
          `os valores de ${corte} em diante somem e a validação fica impossível. Aplicar mesmo assim?`,
      )
    ) {
      return;
    }
    const letras = letrasAtuais();
    for (const ano of anosAPartirDe(corte)) aplicarFormulasNoAno(ano, corte, letras);
    avisar(`Fórmulas aplicadas a partir de ${corte}.`);
  });
}

/** Fórmulas e proteções de um ano, do corte em diante. Chamar dentro do lock. */
export function aplicarFormulasNoAno(ano: number, corte: DataISO, letras: Letras): void {
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
    intervalo.clearContent().setFormulas(formulas.map((linha) => linha.map(local)));
    proteger(intervalo);
  }
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

function porMes(dias: readonly DiaDoBloco[]): Map<number, DiaDoBloco[]> {
  const grupos = new Map<number, DiaDoBloco[]>();
  for (const dia of dias)
    grupos.set(dia.celulas.mes, [...(grupos.get(dia.celulas.mes) ?? []), dia]);
  return grupos;
}
