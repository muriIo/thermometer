/**
 * Migração do plano futuro (PROJECT.md, 9). Cada célula futura de Entrada,
 * Saída ou Diário vira linhas na aba `Migração`, para revisão; um segundo
 * comando importa as marcadas como `previsto`, `origem = migracao`.
 */
import {
  type DataISO,
  deReais,
  diaDoMes,
  MAXIMO_DESCRICAO,
  type MesISO,
  mesDe,
  mesISO,
  paraReais,
  problemaNosCampos,
} from '@termometro/dominio';
import { lerCampos } from './campos';
import { escreverData, lerBooleano, lerData, lerTexto, type Tabela } from './tabela';

export const COLUNAS_MIGRACAO = [
  'importar',
  'aviso',
  'celula',
  'data',
  'tipo',
  'estorna',
  'valor',
  'descricao',
  'categoria',
  'quem',
  'meio',
  'cartao',
  'status',
  'id',
] as const;

export type ColunaDoBloco = 'entrada' | 'saida' | 'diario';

/** Uma célula do plano lida da aba de ano, a partir do corte. */
export type CelulaDoPlano = {
  readonly celula: string;
  readonly ano: number;
  readonly mes: number;
  /** Número da linha do bloco (1–31), que pode não existir no mês. */
  readonly dia: number;
  readonly coluna: ColunaDoBloco;
  readonly valor: unknown;
  readonly formula: string;
  readonly nota: string;
};

type LinhaDeMigracao = Record<(typeof COLUNAS_MIGRACAO)[number], unknown>;

type Previsao = { readonly mes: MesISO; readonly diarioPorDia: number };

export type ResultadoDaMigracao = {
  readonly linhas: LinhaDeMigracao[];
  readonly previsoes: Previsao[];
};

// `getFormulas` devolve na sintaxe da localidade: em pt-BR o decimal é vírgula
// (`=42,69+40`). Numa soma simples não há argumentos, então a vírgula só pode ser decimal.
const NUMERO = String.raw`\d+(?:[.,]\d+)?`;
const SOMA_SIMPLES = new RegExp(String.raw`^=\s*[+-]?\s*${NUMERO}(?:\s*[+-]\s*${NUMERO})*\s*$`);
const MESES_PARA_PARECER_RECORRENTE = 3;

/** `=1800+120-36,6` → [1800, 120, -36.6]. `null` se não for uma soma simples. */
export function parcelasDaFormula(formula: string): number[] | null {
  if (!SOMA_SIMPLES.test(formula)) return null;
  const termos =
    formula
      .slice(1)
      .replace(/\s+/g, '')
      .match(new RegExp(`[+-]?${NUMERO}`, 'g')) ?? [];
  return termos.map((termo) => Number(termo.replace(',', '.')));
}

/** Linhas não vazias da nota; ✅ marca o que já foi pago. */
export function linhasDaNota(nota: string): { texto: string; pago: boolean }[] {
  return nota
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => linha !== '')
    .map((linha) => ({
      texto: linha.replace(/✅/g, '').trim(),
      pago: linha.includes('✅'),
    }));
}

/**
 * Gera as linhas da aba Migração e a Previsão do Diário por mês.
 *
 * - Entrada/Saída: uma linha por parcela da fórmula, pareada com a linha da
 *   nota na mesma ordem; aviso quando as quantidades diferem.
 * - Diário: o valor mais comum do mês vira a Previsão; o que passa dele num
 *   dia vira um lançamento `diario`.
 * - Dia 31 em mês curto (e 29–31 em fevereiro) vai para o último dia real,
 *   com aviso; no Diário, o valor inteiro vira lançamento.
 * - Item igual (mês, tipo, valor) a um lançamento de recorrência já gerado
 *   vem desmarcado: a recorrência já cobre.
 */
export function gerarMigracao(
  celulas: readonly CelulaDoPlano[],
  lancamentos: Tabela,
): ResultadoDaMigracao {
  const cobertos = chavesDasRecorrencias(lancamentos);
  const linhas: LinhaDeMigracao[] = [];
  const previsoes: Previsao[] = [];

  for (const celula of celulas) {
    // Diário em dia inexistente não entra na Previsão: vai inteiro para o último dia real.
    if (celula.coluna !== 'diario' || !diaExiste(celula)) {
      linhas.push(...linhasDaCelula(celula, cobertos));
    }
  }
  for (const [mes, doMes] of agruparDiarioPorMes(celulas)) {
    const previsao = maisComum(doMes.map(({ valor }) => valor));
    previsoes.push({ mes, diarioPorDia: previsao });
    for (const { celula, valor } of doMes)
      linhas.push(...diarioAlemDaPrevisao(celula, valor, previsao));
  }
  marcarParecidas(linhas);
  return { linhas, previsoes };
}

function linhasDaCelula(celula: CelulaDoPlano, cobertos: ReadonlySet<string>): LinhaDeMigracao[] {
  const valor = Number(celula.valor);
  if (celula.valor === '' || !Number.isFinite(valor) || valor === 0) return [];
  const parcelas = parcelasDaFormula(celula.formula) ?? [valor];
  const nota = linhasDaNota(celula.nota);
  const avisos = avisosDaCelula(celula, parcelas, nota.length, valor);
  const data = dataReal(celula);

  return parcelas
    .filter((parcela) => parcela !== 0)
    .map((parcela, i) => {
      const linhaDaNota = parcelas.length === 1 && nota.length > 1 ? juntar(nota) : nota[i];
      const linha = linhaBase(celula, data, parcela, linhaDaNota?.texto ?? '', [...avisos]);
      if (linhaDaNota?.pago) linha.status = 'confirmado';
      if (cobertos.has(chave(data, String(linha.tipo), Math.abs(parcela)))) {
        linha.importar = false;
        (linha.aviso as string[]).push('igual a um lançamento de recorrência já gerado');
      }
      return linha;
    })
    .map(finalizarAviso);
}

function avisosDaCelula(
  celula: CelulaDoPlano,
  parcelas: readonly number[],
  linhasNaNota: number,
  valor: number,
): string[] {
  const avisos: string[] = [];
  if (celula.formula && !parcelasDaFormula(celula.formula)) {
    avisos.push(`fórmula não é uma soma simples (${celula.formula}); importado o valor`);
  }
  if (deReais(parcelas.reduce((total, parcela) => total + parcela, 0)) !== deReais(valor)) {
    avisos.push('soma das parcelas difere do valor da célula');
  }
  if (linhasNaNota > 0 && linhasNaNota !== parcelas.length && parcelas.length > 1) {
    avisos.push(`${parcelas.length} parcelas × ${linhasNaNota} linhas na nota`);
  }
  if (!diaExiste(celula)) {
    avisos.push(`dia ${celula.dia} movido para ${dataReal(celula)}`);
  }
  return avisos;
}

function linhaBase(
  celula: CelulaDoPlano,
  data: DataISO,
  parcela: number,
  descricao: string,
  avisos: string[],
): LinhaDeMigracao {
  const negativo = parcela < 0;
  if (negativo && celula.coluna === 'entrada') avisos.push('entrada negativa: revisar');
  return {
    importar: !(negativo && celula.coluna === 'entrada'),
    aviso: avisos,
    celula: celula.celula,
    data: escreverData(data),
    tipo: negativo && celula.coluna !== 'entrada' ? 'estorno' : celula.coluna,
    estorna: negativo && celula.coluna !== 'entrada' ? celula.coluna : '',
    valor: Math.abs(parcela),
    descricao: descricao.slice(0, MAXIMO_DESCRICAO),
    categoria: '',
    quem: 'Nós dois',
    meio: 'avista',
    cartao: '',
    status: 'previsto',
    id: '',
  };
}

function diarioAlemDaPrevisao(
  celula: CelulaDoPlano,
  valor: number,
  previsao: number,
): LinhaDeMigracao[] {
  const diferenca = paraReais(deReais(valor - previsao));
  if (diferenca === 0) return [];
  const nota = linhasDaNota(celula.nota);
  const linha = linhaBase(celula, dataReal(celula), diferenca, juntar(nota)?.texto ?? '', []);
  if (diferenca < 0) {
    // Diário futuro = Previsão + lançamentos (PROJECT.md 5.4): não há como lançar "menos".
    linha.importar = false;
    (linha.aviso as string[]).push(`Diário abaixo da previsão do mês (${previsao}): revisar`);
  }
  return [finalizarAviso(linha)];
}

type DiarioDoDia = { readonly celula: CelulaDoPlano; readonly valor: number };

function agruparDiarioPorMes(celulas: readonly CelulaDoPlano[]): Map<MesISO, DiarioDoDia[]> {
  const porMes = new Map<MesISO, DiarioDoDia[]>();
  for (const celula of celulas) {
    if (celula.coluna !== 'diario' || !diaExiste(celula)) continue;
    const valor = Number(celula.valor) || 0;
    const mes = mesDoBloco(celula);
    porMes.set(mes, [...(porMes.get(mes) ?? []), { celula, valor }]);
  }
  return porMes;
}

/** Valor mais frequente; empate fica com o maior (o "fixo" costuma ser o maior). */
function maisComum(valores: readonly number[]): number {
  const contagem = new Map<number, number>();
  for (const valor of valores) contagem.set(valor, (contagem.get(valor) ?? 0) + 1);
  let melhor = 0;
  let vezes = 0;
  for (const [valor, n] of contagem) {
    if (n > vezes || (n === vezes && valor > melhor)) [melhor, vezes] = [valor, n];
  }
  return melhor;
}

/** Descrição que se repete em vários meses provavelmente é do modelo mensal. */
function marcarParecidas(linhas: LinhaDeMigracao[]): void {
  const meses = new Map<string, Set<string>>();
  for (const linha of linhas) {
    const descricao = String(linha.descricao).toLowerCase();
    if (!descricao) continue;
    const data = lerData(linha.data);
    if (data) meses.set(descricao, (meses.get(descricao) ?? new Set()).add(mesDe(data)));
  }
  for (const linha of linhas) {
    const quantos = meses.get(String(linha.descricao).toLowerCase())?.size ?? 0;
    if (quantos >= MESES_PARA_PARECER_RECORRENTE && linha.importar) {
      linha.aviso = [linha.aviso, `aparece em ${quantos} meses: virar recorrência?`]
        .filter(Boolean)
        .join('; ');
    }
  }
}

function chavesDasRecorrencias(lancamentos: Tabela): Set<string> {
  const chaves = new Set<string>();
  for (const { dados } of lancamentos.registros) {
    const data = lerData(dados.data);
    if (!data || !lerTexto(dados.recorrencia_id) || lerBooleano(dados.excluido)) continue;
    chaves.add(chave(data, lerTexto(dados.tipo), Number(dados.valor)));
  }
  return chaves;
}

function chave(data: DataISO, tipo: string, valor: number): string {
  return `${mesDe(data)}|${tipo}|${deReais(valor)}`;
}

function juntar(nota: readonly { texto: string; pago: boolean }[]) {
  if (nota.length === 0) return undefined;
  return { texto: nota.map((linha) => linha.texto).join(' / '), pago: nota.every((l) => l.pago) };
}

function finalizarAviso(linha: LinhaDeMigracao): LinhaDeMigracao {
  if (Array.isArray(linha.aviso)) linha.aviso = linha.aviso.join('; ');
  return linha;
}

function mesDoBloco(celula: CelulaDoPlano): MesISO {
  return mesISO(`${celula.ano}-${celula.mes.toString().padStart(2, '0')}`);
}

function diaExiste(celula: CelulaDoPlano): boolean {
  return Number(diaDoMes(mesDoBloco(celula), celula.dia).slice(8)) === celula.dia;
}

/** Dia 31 em mês de 30 dias (e 29–31 em fevereiro) vira o último dia real. */
function dataReal(celula: CelulaDoPlano): DataISO {
  return diaDoMes(mesDoBloco(celula), celula.dia);
}

export type Importacao = {
  readonly lancamentos: Record<string, unknown>[];
  /** Linha da aba Migração (1-based) → id gravado, para não importar duas vezes. */
  readonly idsGravados: { linha: number; id: string }[];
  readonly avisos: string[];
};

/** Linhas marcadas e ainda sem `id` viram lançamentos `origem = migracao`. */
export function planejarImportacao(
  migracao: Tabela,
  agora: Date,
  novoId: () => string,
): Importacao {
  const importacao: Importacao = { lancamentos: [], idsGravados: [], avisos: [] };
  for (const { linha, dados } of migracao.registros) {
    if (!lerBooleano(dados.importar) || lerTexto(dados.id)) continue;
    const data = lerData(dados.data);
    const valor = Number(dados.valor);
    const lidos = lerCampos(dados);
    const campos = { ...lidos, descricao: lidos.descricao.slice(0, MAXIMO_DESCRICAO) };
    const status = lerTexto(dados.status) || 'previsto';
    const problema =
      (!data && 'data inválida') ||
      ((!Number.isFinite(valor) || valor <= 0) && 'valor inválido') ||
      (!['previsto', 'confirmado'].includes(status) && 'status inválido') ||
      problemaNosCampos(campos);
    if (!data || problema) {
      importacao.avisos.push(`Migração, linha ${linha}: ${problema}`);
      continue;
    }
    const id = novoId();
    importacao.idsGravados.push({ linha, id });
    importacao.lancamentos.push({
      ...campos,
      id,
      data: escreverData(data),
      valor: paraReais(deReais(valor)),
      status,
      registrado_por: '',
      origem: 'migracao',
      criado_em: agora,
      atualizado_em: agora,
      excluido: false,
    });
  }
  return importacao;
}
