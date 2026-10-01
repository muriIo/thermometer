import { dataISO } from '@termometro/dominio';
import { describe, expect, it } from 'vitest';
import { definicao } from './esquema';
import { type Leitura, planejarGeracao } from './gerar';
import { lerTabela } from './tabela';

const AGORA = new Date(2026, 9, 24, 10, 0);
const HOJE = dataISO('2026-10-24');
const ATE = dataISO('2026-12-31');

const COLUNAS_REGRA = definicao('Recorrentes').colunas;
const COLUNAS_LANCAMENTO = definicao('Lançamentos').colunas;

function regra(campos: Record<string, unknown>): unknown[] {
  const base: Record<string, unknown> = {
    id: 'aluguel',
    descricao: 'Aluguel',
    tipo: 'saida',
    estorna: '',
    valor: 2500,
    categoria: 'Casa',
    quem: 'Nós dois',
    meio: 'avista',
    cartao: '',
    dia: 5,
    inicio: new Date(2026, 9, 24),
    fim: '',
    ativo: true,
    ...campos,
  };
  return COLUNAS_REGRA.map((coluna) => base[coluna] ?? '');
}

function lancamento(campos: Record<string, unknown>): unknown[] {
  return COLUNAS_LANCAMENTO.map((coluna) => campos[coluna] ?? '');
}

function leitura(partes: {
  recorrentes?: unknown[][];
  lancamentos?: unknown[][];
  cartoes?: unknown[][];
  faturas?: unknown[][];
}): Leitura {
  return {
    recorrentes: lerTabela([[...COLUNAS_REGRA], ...(partes.recorrentes ?? [])]),
    lancamentos: lerTabela([[...COLUNAS_LANCAMENTO], ...(partes.lancamentos ?? [])]),
    cartoes: lerTabela([
      ['id', 'nome', 'dono', 'fechamento', 'vencimento', 'limite', 'ativo'],
      ...(partes.cartoes ?? []),
    ]),
    faturas: lerTabela([
      ['id', 'cartao', 'fecha_em', 'vence_em', 'pago_em'],
      ...(partes.faturas ?? []),
    ]),
  };
}

function contador(): () => string {
  let n = 0;
  return () => `uuid-${n++}`;
}

describe('planejarGeracao: recorrências', () => {
  it('regra nova vira previstos com origem recorrencia, em reais', () => {
    const plano = planejarGeracao(
      leitura({ recorrentes: [regra({})] }),
      HOJE,
      ATE,
      AGORA,
      contador(),
    );
    expect(plano.lancamentosNovos).toHaveLength(2);
    expect(plano.lancamentosNovos[0]).toEqual({
      id: 'uuid-0',
      data: new Date(2026, 10, 5),
      valor: 2500,
      tipo: 'saida',
      estorna: '',
      categoria: 'Casa',
      descricao: 'Aluguel',
      quem: 'Nós dois',
      registrado_por: '',
      meio: 'avista',
      cartao: '',
      status: 'previsto',
      grupo_id: '',
      parcela_n: '',
      parcelas: '',
      recorrencia_id: 'aluguel',
      origem: 'recorrencia',
      criado_em: AGORA,
      atualizado_em: AGORA,
      excluido: false,
    });
    expect(plano.avisos).toEqual([]);
  });

  it('rodar de novo sobre o que já foi gerado não muda nada', () => {
    const primeira = planejarGeracao(
      leitura({ recorrentes: [regra({})] }),
      HOJE,
      ATE,
      AGORA,
      contador(),
    );
    const gravadas = primeira.lancamentosNovos.map(lancamento);
    const segunda = planejarGeracao(
      leitura({ recorrentes: [regra({})], lancamentos: gravadas }),
      HOJE,
      ATE,
      AGORA,
      contador(),
    );
    expect(segunda.lancamentosNovos).toEqual([]);
    expect(segunda.lancamentosAlterados).toEqual([]);
  });

  it('aluguel sobe: atualiza o previsto futuro na linha certa; confirmado e excluído ficam', () => {
    const existentes = [
      lancamento({
        id: 'nov',
        data: new Date(2026, 10, 5),
        valor: 2500,
        tipo: 'saida',
        categoria: 'Casa',
        descricao: 'Aluguel',
        quem: 'Nós dois',
        meio: 'avista',
        status: 'confirmado',
        recorrencia_id: 'aluguel',
      }),
      lancamento({
        id: 'dez',
        data: new Date(2026, 11, 5),
        valor: 2500,
        tipo: 'saida',
        categoria: 'Casa',
        descricao: 'Aluguel',
        quem: 'Nós dois',
        meio: 'avista',
        status: 'previsto',
        recorrencia_id: 'aluguel',
      }),
      lancamento({
        id: 'velho',
        data: new Date(2026, 11, 5),
        valor: 1,
        status: 'previsto',
        recorrencia_id: 'aluguel',
        excluido: true,
      }),
    ];
    const plano = planejarGeracao(
      leitura({ recorrentes: [regra({ valor: 2700 })], lancamentos: existentes }),
      HOJE,
      ATE,
      AGORA,
      contador(),
    );
    expect(plano.lancamentosNovos).toEqual([]);
    expect(plano.lancamentosAlterados).toHaveLength(1);
    expect(plano.lancamentosAlterados[0]).toMatchObject({
      linha: 3,
      campos: { valor: 2700, data: new Date(2026, 11, 5), atualizado_em: AGORA },
    });
    expect(plano.lancamentosAlterados[0]?.campos).not.toHaveProperty('id');
  });

  it('regra desativada exclui os previstos futuros', () => {
    const existentes = [
      lancamento({
        id: 'dez',
        data: new Date(2026, 11, 5),
        valor: 2500,
        status: 'previsto',
        recorrencia_id: 'aluguel',
      }),
    ];
    const plano = planejarGeracao(
      leitura({ recorrentes: [regra({ ativo: false })], lancamentos: existentes }),
      HOJE,
      ATE,
      AGORA,
      contador(),
    );
    expect(plano.lancamentosAlterados).toEqual([
      { linha: 2, campos: { excluido: true, atualizado_em: AGORA } },
    ]);
  });

  it('regra digitada sem id ganha um, gravado de volta', () => {
    const plano = planejarGeracao(
      leitura({ recorrentes: [regra({ id: '' })] }),
      HOJE,
      ATE,
      AGORA,
      contador(),
    );
    expect(plano.regrasSemId).toEqual([{ linha: 2, id: 'uuid-0' }]);
    expect(plano.lancamentosNovos[0]?.recorrencia_id).toBe('uuid-0');
  });

  it('ativo vazio conta como ativa; meio vazio, como à vista', () => {
    const plano = planejarGeracao(
      leitura({ recorrentes: [regra({ ativo: '', meio: '' })] }),
      HOJE,
      ATE,
      AGORA,
      contador(),
    );
    expect(plano.lancamentosNovos).toHaveLength(2);
    expect(plano.lancamentosNovos[0]?.meio).toBe('avista');
  });

  it.each([
    [{ inicio: '' }, 'início vazio ou inválido'],
    [{ fim: 'amanhã' }, 'fim inválido'],
    [{ dia: 0 }, 'dia inválido (0)'],
    [{ valor: -5 }, 'valor inválido (-5)'],
    [{ tipo: 'gasto' }, 'tipo inválido (gasto)'],
    [{ tipo: 'estorno' }, 'estorno sem "estorna" (diario ou saida)'],
    [{ meio: 'pix' }, 'meio inválido (pix)'],
    [{ meio: 'cartao' }, 'meio cartão sem cartão'],
  ])('regra inválida %o é ignorada com aviso', (campos, motivo) => {
    const plano = planejarGeracao(
      leitura({ recorrentes: [regra(campos)] }),
      HOJE,
      ATE,
      AGORA,
      contador(),
    );
    expect(plano.lancamentosNovos).toEqual([]);
    expect(plano.avisos).toEqual([`Recorrentes, linha 2: ${motivo}`]);
  });
});

describe('planejarGeracao: faturas', () => {
  const INTER = ['INTER', 'Cartão Murilo (Inter)', 'Murilo', 24, 1, 6600, true];

  it('gera do mês de hoje até a fatura que recebe compras do último dia do horizonte', () => {
    const plano = planejarGeracao(leitura({ cartoes: [INTER] }), HOJE, ATE, AGORA, contador());
    expect(plano.faturasNovas.map((f) => f.id)).toEqual([
      'INTER-2026-10',
      'INTER-2026-11',
      'INTER-2026-12',
      'INTER-2027-01',
    ]);
    expect(plano.faturasNovas[0]).toEqual({
      id: 'INTER-2026-10',
      cartao: 'INTER',
      fecha_em: new Date(2026, 9, 24),
      vence_em: new Date(2026, 10, 1),
      pago_em: '',
    });
  });

  it('não duplica faturas existentes nem gera para cartão inativo', () => {
    const plano = planejarGeracao(
      leitura({
        cartoes: [INTER, ['VELHO', 'Antigo', 'Thays', 10, 20, 1000, false]],
        faturas: [['INTER-2026-10'], ['INTER-2026-11']],
      }),
      HOJE,
      ATE,
      AGORA,
      contador(),
    );
    expect(plano.faturasNovas.map((f) => f.id)).toEqual(['INTER-2026-12', 'INTER-2027-01']);
  });

  it('cartão com dia inválido é avisado', () => {
    const plano = planejarGeracao(
      leitura({ cartoes: [['X', 'X', 'Murilo', 0, 1, 1, true]] }),
      HOJE,
      ATE,
      AGORA,
      contador(),
    );
    expect(plano.faturasNovas).toEqual([]);
    expect(plano.avisos).toEqual(['Cartões, linha 2: id, fechamento ou vencimento inválido']);
  });
});
