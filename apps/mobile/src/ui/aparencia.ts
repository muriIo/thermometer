/** Cores e rótulos por tipo e situação (PROJECT.md, 10). Estorno ainda sem cor definida (seção 19). */
import type { Tipo } from '@termometro/dominio';
import type { LancamentoNaTela } from '../aplicacao/projecao.ts';

export const TIPOS_VISUAIS: Readonly<
  Record<Tipo, { nome: string; letra: string; cor: string; fundo: string }>
> = {
  diario: { nome: 'Diário', letra: 'D', cor: '#1D4ED8', fundo: '#E8EEFD' },
  saida: { nome: 'Saída', letra: 'S', cor: '#B43C0A', fundo: '#FCEBDF' },
  entrada: { nome: 'Entrada', letra: 'E', cor: '#0B6B4A', fundo: '#E1F3EA' },
  estorno: { nome: 'Estorno', letra: 'R', cor: '#5B6070', fundo: '#EEEFF2' },
};

export const SITUACOES_VISUAIS: Readonly<
  Record<LancamentoNaTela['situacao'], { texto: string; cor: string; icone: string } | null>
> = {
  sincronizado: null,
  pendente: { texto: 'pendente', cor: '#9A4A00', icone: 'lucide-clock' },
  enviando: { texto: 'enviando', cor: '#1D4ED8', icone: 'lucide-refresh-cw' },
  travado: { texto: 'recusado', cor: '#B43C0A', icone: 'lucide-triangle-alert' },
};
