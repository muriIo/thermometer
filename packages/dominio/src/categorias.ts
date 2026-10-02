/**
 * Categorias (PROJECT.md, 5.3). Fonte única para app e script; cores e
 * ícones (Lucide) são propostas a revisar. Receitas ainda sem cor definida.
 */
export type Categoria = {
  readonly nome: string;
  readonly icone: string;
  readonly cor?: string;
  readonly fundo?: string;
};

/** Diário, Saída e Estorno. */
export const CATEGORIAS_GASTO: readonly Categoria[] = [
  { nome: 'Alimentação', cor: '#C2410C', fundo: '#FCEBDF', icone: 'utensils' },
  { nome: 'Assinaturas e serviços', cor: '#6D28D9', fundo: '#EFE8FC', icone: 'receipt' },
  { nome: 'Casa', cor: '#0B6B4A', fundo: '#E1F3EA', icone: 'house' },
  { nome: 'Compras', cor: '#1D4ED8', fundo: '#E8EEFD', icone: 'shopping-bag' },
  { nome: 'Cuidados pessoais', cor: '#A21CAF', fundo: '#FAE8FF', icone: 'sparkles' },
  { nome: 'Delivery', cor: '#DC2626', fundo: '#FDE8E8', icone: 'bike' },
  { nome: 'Docinho pós almoço', cor: '#B45309', fundo: '#FDF0DC', icone: 'candy' },
  { nome: 'Família e amigos', cor: '#0369A1', fundo: '#E0F2FE', icone: 'users' },
  { nome: 'Lazer e hobbies', cor: '#A16207', fundo: '#FBF0D4', icone: 'gamepad-2' },
  { nome: 'Pets', cor: '#4D7C0F', fundo: '#ECF5DC', icone: 'paw-print' },
  { nome: 'Saúde', cor: '#BE185D', fundo: '#FBE7F0', icone: 'heart-pulse' },
  { nome: 'Trabalho', cor: '#334155', fundo: '#E8ECF1', icone: 'briefcase' },
  { nome: 'Transporte', cor: '#0F766E', fundo: '#DDF3F0', icone: 'car' },
  { nome: 'Viagem', cor: '#0E7490', fundo: '#DDF4F8', icone: 'plane' },
  { nome: 'Empréstimos', cor: '#57534E', fundo: '#EEECEA', icone: 'hand-coins' },
  { nome: 'Outros', cor: '#5B6070', fundo: '#EEEFF2', icone: 'circle-dashed' },
];

/** Entrada. */
export const CATEGORIAS_RECEITA: readonly Categoria[] = [
  { nome: 'Salário', icone: 'wallet' },
  { nome: 'Investimentos', icone: 'trending-up' },
  { nome: 'Empréstimos', icone: 'hand-coins' },
  { nome: 'Outras receitas', icone: 'plus-circle' },
];

/** Nomes de todas as categorias, sem repetir ("Empréstimos" está nas duas listas). */
export function nomesDeCategorias(): string[] {
  return [...new Set([...CATEGORIAS_GASTO, ...CATEGORIAS_RECEITA].map((c) => c.nome))];
}
