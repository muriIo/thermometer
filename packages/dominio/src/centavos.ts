/**
 * Dinheiro é sempre um inteiro de centavos no código (PROJECT.md, seção 5.6).
 * Reais só existem na leitura/escrita da planilha e na formatação de tela.
 */
export type Centavos = number & { readonly __marca: 'Centavos' };

export function centavos(valor: number): Centavos {
  if (!Number.isSafeInteger(valor)) {
    throw new RangeError(`Centavos precisam ser um inteiro seguro; recebido ${valor}`);
  }
  return valor as Centavos;
}

/** Valor em reais vindo da planilha → centavos. */
export function deReais(reais: number): Centavos {
  return centavos(Math.round(reais * 100));
}

/** Centavos → valor em reais para escrever na planilha. */
export function paraReais(valor: Centavos): number {
  return valor / 100;
}

export function somar(valores: readonly Centavos[]): Centavos {
  let total = 0;
  for (const valor of valores) total += valor;
  return centavos(total);
}

/**
 * Formata como "R$ 1.234,56". Implementado sem `Intl` para ter o mesmo
 * resultado no Apps Script e no Hermes.
 */
export function formatarReais(valor: Centavos): string {
  const sinal = valor < 0 ? '-' : '';
  const absoluto = Math.abs(valor);
  const inteiro = Math.floor(absoluto / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fracao = (absoluto % 100).toString().padStart(2, '0');
  return `${sinal}R$ ${inteiro},${fracao}`;
}
