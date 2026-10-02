/**
 * Menu "Verificar fórmulas". O domínio é a referência: a fórmula ƒ
 * `fatura_id` tem de dar o mesmo que `mesDaFatura` em toda linha.
 */
import { type CicloDoCartao, faturaId, mesDaFatura } from '@termometro/dominio';
import { localizarFormula } from './sintaxe';
import { lerBooleano, lerData, lerTexto, type Tabela } from './tabela';

/**
 * O Sheets reescreve a fórmula gravada (tira aspas desnecessárias do nome da
 * aba, muda espaços e caixa) e a guarda na sintaxe da localidade (`;` em
 * pt-BR). A comparação ignora essas diferenças.
 */
export function normalizarFormula(formula: string): string {
  return localizarFormula(formula, ';').replace(/'/g, '').replace(/\s+/g, '').toUpperCase();
}

export type Divergencia = { readonly onde: string; readonly problema: string };

export function conferirFormula(onde: string, esperada: string, atual: string): Divergencia[] {
  if (esperada === '') {
    return atual === '' ? [] : [{ onde, problema: 'deveria estar vazia (dia inexistente)' }];
  }
  if (atual === '') return [{ onde, problema: 'perdeu a fórmula' }];
  return normalizarFormula(atual) === normalizarFormula(esperada)
    ? []
    : [{ onde, problema: 'fórmula diferente da gerada' }];
}

/** Toda compra no cartão tem o `fatura_id` que o domínio calcula. */
export function conferirFaturaIds(lancamentos: Tabela, cartoes: Tabela): Divergencia[] {
  const ciclos = new Map<string, CicloDoCartao>();
  for (const { dados } of cartoes.registros) {
    const id = lerTexto(dados.id);
    ciclos.set(id, {
      id,
      fechamento: Number(dados.fechamento),
      vencimento: Number(dados.vencimento),
    });
  }
  const divergencias: Divergencia[] = [];
  for (const { linha, dados } of lancamentos.registros) {
    if (lerTexto(dados.meio) !== 'cartao' || lerBooleano(dados.excluido)) continue;
    const onde = `Lançamentos, linha ${linha}`;
    const ciclo = ciclos.get(lerTexto(dados.cartao));
    const data = lerData(dados.data);
    if (!ciclo || !data) {
      divergencias.push({ onde, problema: 'compra no cartão sem cartão cadastrado ou sem data' });
      continue;
    }
    const parcela = Number(dados.parcela_n) || 1;
    const esperado = faturaId(ciclo.id, mesDaFatura(ciclo, data, parcela));
    const atual = lerTexto(dados.fatura_id);
    if (atual !== esperado) {
      divergencias.push({
        onde,
        problema: `fatura_id ${atual || '(vazio)'}, esperado ${esperado}`,
      });
    }
  }
  return divergencias;
}
