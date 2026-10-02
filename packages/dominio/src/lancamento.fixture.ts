// Lançamento de exemplo para testes.
import { centavos } from './centavos';
import { dataISO } from './datas';
import type { Lancamento } from './lancamento';

export const SALGADO: Lancamento = {
  id: 'a',
  data: dataISO('2026-11-05'),
  valorCentavos: centavos(800),
  tipo: 'diario',
  estorna: '',
  categoria: 'Alimentação',
  descricao: 'Salgado',
  quem: 'Thays',
  meio: 'avista',
  cartao: '',
  status: 'confirmado',
  grupoId: '',
  parcelaN: null,
  parcelas: null,
  recorrenciaId: '',
  excluido: false,
};
