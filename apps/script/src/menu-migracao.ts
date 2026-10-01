// Comandos de migração e validação (PROJECT.md, 9). A lógica está em migracao.ts e validacao.ts.
import { type DataISO, diaDoMes, mesISO } from '@termometro/dominio';
import { anosAPartirDe, avisar, comLock, dataDeCorte } from './contexto';
import { ABAS } from './esquema';
import { celulasDoDia } from './formulas';
import {
  type CelulaDoPlano,
  COLUNAS_MIGRACAO,
  type ColunaDoBloco,
  gerarMigracao,
  planejarImportacao,
} from './migracao';
import { aba, abaObrigatoria, acrescentar, ler, planilha } from './planilha';
import { lerTabela, lerTexto, letraDaColuna } from './tabela';
import { COLUNAS_VALIDACAO, compararSaldos, resumir, type SaldoDoDia } from './validacao';

const MIGRACAO = 'Migração';
const VALIDACAO = 'Validação';
const COLUNAS_DO_BLOCO: readonly ColunaDoBloco[] = ['entrada', 'saida', 'diario'];

/** Lê as células futuras do plano e escreve a aba Migração para revisão. */
export function gerarAbaMigracao(): void {
  comLock(() => {
    const existente = aba(MIGRACAO);
    if (
      existente &&
      existente.getLastRow() > 1 &&
      !confirmar('A aba Migração já existe. Recriar?')
    ) {
      return;
    }
    const corte = dataDeCorte();
    const celulas = anosAPartirDe(corte).flatMap((ano) => lerPlano(ano, corte));
    const { linhas, previsoes } = gerarMigracao(celulas, ler(ABAS.lancamentos).tabela);

    const destino = existente ?? planilha().insertSheet(MIGRACAO);
    destino.clear();
    destino.getRange(1, 1, 1, COLUNAS_MIGRACAO.length).setValues([[...COLUNAS_MIGRACAO]]);
    destino.setFrozenRows(1);
    if (linhas.length > 0) {
      destino
        .getRange(2, 1, linhas.length, COLUNAS_MIGRACAO.length)
        .setValues(linhas.map((linha) => COLUNAS_MIGRACAO.map((coluna) => linha[coluna])));
      destino.getRange(2, 1, linhas.length, 1).insertCheckboxes();
      destino
        .getRange(2, COLUNAS_MIGRACAO.indexOf('data') + 1, linhas.length, 1)
        .setNumberFormat('dd/mm/yyyy');
    }

    const jaPrevistos = new Set(
      ler(ABAS.previsao).tabela.registros.map(({ dados }) => lerTexto(dados.mes)),
    );
    acrescentar(
      ABAS.previsao,
      previsoes
        .filter(({ mes }) => !jaPrevistos.has(mes))
        .map(({ mes, diarioPorDia }) => ({ mes, diario_por_dia: diarioPorDia })),
    );
    avisar(
      `${linhas.length} linhas na aba Migração e ${previsoes.length} meses de Previsão. ` +
        'Revise (desmarque o que virou recorrência) e rode "Importar Migração".',
    );
  });
}

export function importarMigracao(): void {
  comLock(() => {
    const destino = abaObrigatoria(MIGRACAO);
    const tabela = lerTabela(destino.getDataRange().getValues());
    const importacao = planejarImportacao(tabela, new Date(), () => Utilities.getUuid());
    acrescentar(ABAS.lancamentos, importacao.lancamentos);
    const colunaId = tabela.cabecalho.indexOf('id') + 1;
    for (const { linha, id } of importacao.idsGravados)
      destino.getRange(linha, colunaId).setValue(id);
    avisar(
      [`${importacao.lancamentos.length} lançamentos importados.`, ...importacao.avisos].join('\n'),
    );
  });
}

/** Fotografa o Saldo de cada dia a partir do mês do corte. Rodar antes de aplicar as fórmulas. */
export function registrarSaldos(): void {
  comLock(() => {
    const existente = aba(VALIDACAO);
    if (
      existente &&
      existente.getLastRow() > 1 &&
      !confirmar('Sobrescrever os saldos registrados?')
    ) {
      return;
    }
    const corte = dataDeCorte();
    const linhas = saldosAtuais(corte).map(({ ano, mes, dia, saldo }) => [
      ano,
      mes,
      dia,
      saldo,
      '',
      '',
    ]);
    const destino = existente ?? planilha().insertSheet(VALIDACAO);
    destino.clear();
    destino.getRange(1, 1, 1, COLUNAS_VALIDACAO.length).setValues([[...COLUNAS_VALIDACAO]]);
    if (linhas.length > 0)
      destino.getRange(2, 1, linhas.length, COLUNAS_VALIDACAO.length).setValues(linhas);
    avisar(`${linhas.length} saldos registrados.`);
  });
}

export function relatorioValidacao(): void {
  comLock(() => {
    const destino = abaObrigatoria(VALIDACAO);
    const antes = lerTabela(destino.getDataRange().getValues()).registros;
    const atuais = new Map(
      saldosAtuais(dataDeCorte()).map((s) => [`${s.ano}-${s.mes}-${s.dia}`, s.saldo]),
    );
    const saldos: SaldoDoDia[] = antes.map(({ dados }) => {
      const [ano, mes, dia] = [Number(dados.ano), Number(dados.mes), Number(dados.dia)];
      const depois = atuais.get(`${ano}-${mes}-${dia}`) ?? Number.NaN;
      return { ano, mes, dia, antes: Number(dados.saldo_antes), depois };
    });
    if (saldos.length > 0) {
      destino
        .getRange(2, 5, saldos.length, 2)
        .setValues(saldos.map((s) => [s.depois, Math.round((s.depois - s.antes) * 100) / 100]));
    }
    avisar(resumir(compararSaldos(saldos)));
  });
}

function lerPlano(ano: number, corte: DataISO): CelulaDoPlano[] {
  const intervalo = abaObrigatoria(String(ano)).getRange(1, 1, 33, 6 * 12);
  const [valores, formulas, notas] = [
    intervalo.getValues(),
    intervalo.getFormulas(),
    intervalo.getNotes(),
  ];
  const celulas: CelulaDoPlano[] = [];
  for (let mes = 1; mes <= 12; mes++) {
    for (let dia = 1; dia <= 31; dia++) {
      // Linha do bloco a partir do corte; dias inexistentes contam pelo último dia real.
      if (diaDoMes(mesISO(`${ano}-${mes.toString().padStart(2, '0')}`), dia) < corte) continue;
      const posicao = celulasDoDia(ano, mes, dia);
      for (const coluna of COLUNAS_DO_BLOCO) {
        const [linha, indice] = [posicao.linha - 1, posicao[coluna] - 1];
        celulas.push({
          celula: `${ano}!${letraDaColuna(indice)}${posicao.linha}`,
          ano,
          mes,
          dia,
          coluna,
          valor: valores[linha]?.[indice] ?? '',
          formula: formulas[linha]?.[indice] ?? '',
          nota: notas[linha]?.[indice] ?? '',
        });
      }
    }
  }
  return celulas;
}

type SaldoAtual = { ano: number; mes: number; dia: number; saldo: number };

function saldosAtuais(corte: DataISO): SaldoAtual[] {
  const primeiroMes = Number(corte.slice(5, 7));
  const saldos: SaldoAtual[] = [];
  for (const ano of anosAPartirDe(corte)) {
    const valores = abaObrigatoria(String(ano))
      .getRange(1, 1, 33, 6 * 12)
      .getValues();
    for (let mes = ano === Number(corte.slice(0, 4)) ? primeiroMes : 1; mes <= 12; mes++) {
      for (let dia = 1; dia <= 31; dia++) {
        const posicao = celulasDoDia(ano, mes, dia);
        saldos.push({
          ano,
          mes,
          dia,
          saldo: Number(valores[posicao.linha - 1]?.[posicao.saldo - 1]) || 0,
        });
      }
    }
  }
  return saldos;
}

function confirmar(pergunta: string): boolean {
  const ui = SpreadsheetApp.getUi();
  return ui.alert(pergunta, ui.ButtonSet.YES_NO) === ui.Button.YES;
}
