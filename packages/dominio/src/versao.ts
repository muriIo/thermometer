import type { Lancamento } from './lancamento';

/**
 * Campos que entram na `versao` (ADR 0006): tudo que uma edição, no app ou à
 * mão, pode mudar. `id` não muda; `origem`, `registrado_por`, `criado_em` e
 * `atualizado_em` são controle e ficam de fora.
 */
const CAMPOS: readonly (keyof Lancamento)[] = [
  'data',
  'valorCentavos',
  'tipo',
  'estorna',
  'categoria',
  'descricao',
  'quem',
  'meio',
  'cartao',
  'status',
  'grupoId',
  'parcelaN',
  'parcelas',
  'recorrenciaId',
  'excluido',
];

/** Hash do conteúdo da linha, para detectar edição concorrente (PROJECT.md, 6.4). */
export function versao(lancamento: Lancamento): string {
  const texto = CAMPOS.map((campo) => String(lancamento[campo] ?? '')).join('\u001f');
  return cyrb53(texto).toString(16).padStart(14, '0');
}

/**
 * cyrb53: hash não criptográfico de 53 bits, sem dependências, igual no
 * Apps Script e no Hermes. Só precisa detectar mudança, não resistir a ataque.
 */
function cyrb53(texto: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
