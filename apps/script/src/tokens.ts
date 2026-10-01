/** Mapa token → nome da pessoa, guardado em Propriedades do Script (`TOKENS`). */
export type Tokens = Readonly<Record<string, string>>;

export function lerTokens(json: string | null): Tokens {
  if (!json) return {};
  const valor: unknown = JSON.parse(json);
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return {};
  const tokens: Record<string, string> = {};
  for (const [token, nome] of Object.entries(valor)) {
    if (typeof nome === 'string' && token.length > 0) tokens[token] = nome;
  }
  return tokens;
}

/** Compara em tempo constante para não vazar o token por tempo de resposta. */
function iguais(a: string, b: string): boolean {
  const tamanho = Math.max(a.length, b.length);
  let diferenca = a.length ^ b.length;
  for (let i = 0; i < tamanho; i++) {
    diferenca |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diferenca === 0;
}

/** Devolve o nome do dono do token, ou `null`. Percorre todos para não vazar posição. */
export function autenticar(tokens: Tokens, token: string): string | null {
  let nome: string | null = null;
  for (const [candidato, dono] of Object.entries(tokens)) {
    if (iguais(candidato, token)) nome = dono;
  }
  return nome;
}
