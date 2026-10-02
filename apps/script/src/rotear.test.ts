import { VERSAO_CONTRATO } from '@termometro/contract';
import { dataISO } from '@termometro/dominio';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ABAS } from './esquema';
import { PlanilhaFalsa } from './planilha-falsa';
import { type Ambiente, rotear } from './rotear';

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

let planilha: PlanilhaFalsa;
let ambiente: Ambiente;

beforeEach(() => {
  planilha = new PlanilhaFalsa();
  ambiente = {
    tokens: { 'token-murilo': 'Murilo', 'token-thays': 'Thays' },
    versaoScript: '0.0.0',
    agora: () => new Date('2026-11-01T12:00:00Z'),
    hoje: () => dataISO('2026-11-01'),
    planilha,
    podeEscrever: true,
    comLock: vi.fn((acao) => acao()),
  };
});

function chamar(action: string, payload: unknown, token = 'token-thays') {
  return rotear(JSON.stringify({ v: VERSAO_CONTRATO, token, action, payload }), ambiente);
}

// biome-ignore lint/suspicious/noExplicitAny: atalho de teste para ler `data` das respostas.
function dados(resposta: ReturnType<typeof rotear>): any {
  if (!resposta.ok) throw new Error(`${resposta.error.code}: ${resposta.error.message}`);
  return resposta.data;
}

const SALGADO = {
  id: ID(1),
  data: '2026-11-01',
  valorCentavos: 800,
  tipo: 'diario',
  categoria: 'Alimentação',
  descricao: 'Salgado',
  quem: 'Thays',
  meio: 'avista',
  status: 'confirmado',
};

function linhasGravadas() {
  return planilha.ler(ABAS.lancamentos).registros.map((r) => r.dados);
}

describe('autenticação e envelope', () => {
  it('ping devolve o nome do dono do token', () => {
    expect(chamar('ping', null)).toEqual({
      ok: true,
      data: { versaoScript: '0.0.0', horaServidor: '2026-11-01T12:00:00.000Z', nome: 'Thays' },
    });
  });

  it('recusa token desconhecido, JSON malformado e versão não suportada', () => {
    expect(chamar('ping', null, 'token-murilx')).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
    expect(rotear('{', ambiente)).toMatchObject({ error: { code: 'INVALID_PAYLOAD' } });
    const v99 = JSON.stringify({ v: 99, token: 'token-thays', action: 'ping', payload: null });
    expect(rotear(v99, ambiente)).toMatchObject({ error: { code: 'UNSUPPORTED_VERSION' } });
  });

  it('recusa payload inválido dizendo o campo', () => {
    const resposta = chamar('lancar', { linhas: [{ ...SALGADO, valorCentavos: -1 }] });
    expect(resposta).toMatchObject({ error: { code: 'INVALID_PAYLOAD' } });
    expect(resposta.ok || resposta.error.message).toMatch(/linhas\.0\.valorCentavos/);
  });
});

describe('lancar', () => {
  it('grava com registrado_por do token e origem app, dentro do lock', () => {
    const { linhas } = dados(chamar('lancar', { linhas: [SALGADO] }, 'token-murilo'));
    expect(linhas[0]).toMatchObject({ id: ID(1), valorCentavos: 800, registradoPor: 'Murilo' });
    expect(linhasGravadas()[0]).toMatchObject({
      id: ID(1),
      valor: 8,
      tipo: 'diario',
      registrado_por: 'Murilo',
      origem: 'app',
      excluido: false,
    });
    expect(ambiente.comLock).toHaveBeenCalledTimes(1);
  });

  it('reenvio do mesmo id não duplica e devolve a linha gravada', () => {
    const primeira = dados(chamar('lancar', { linhas: [SALGADO] }));
    const segunda = dados(chamar('lancar', { linhas: [{ ...SALGADO, valorCentavos: 999 }] }));
    expect(linhasGravadas()).toHaveLength(1);
    expect(segunda.linhas[0].valorCentavos).toBe(800);
    expect(segunda.linhas[0].versao).toBe(primeira.linhas[0].versao);
  });

  it('parcelado: as N linhas do grupo numa chamada', () => {
    const parcelas = [3334, 3333, 3333].map((valorCentavos, i) => ({
      ...SALGADO,
      id: ID(10 + i),
      tipo: 'saida',
      meio: 'cartao',
      cartao: 'INTER',
      valorCentavos,
      grupoId: ID(99),
      parcelaN: i + 1,
      parcelas: 3,
    }));
    expect(dados(chamar('lancar', { linhas: parcelas })).linhas).toHaveLength(3);
    expect(linhasGravadas().map((l) => [l.grupo_id, l.parcela_n, l.valor])).toEqual([
      [ID(99), 1, 33.34],
      [ID(99), 2, 33.33],
      [ID(99), 3, 33.33],
    ]);
  });

  it('uma linha inválida impede a gravação de todas', () => {
    const invalida = { ...SALGADO, id: ID(2), meio: 'cartao', cartao: 'NUBANK' };
    const resposta = chamar('lancar', { linhas: [SALGADO, invalida] });
    expect(resposta).toMatchObject({ error: { code: 'INVALID_PAYLOAD' } });
    expect(resposta.ok || resposta.error.message).toBe(
      'Linha 2: cartão desconhecido ou inativo (NUBANK)',
    );
    expect(linhasGravadas()).toHaveLength(0);
  });

  it.each([
    ['acima do valor máximo', { valorCentavos: 2_000_001 }, /valor acima do máximo/],
    ['data a mais de um ano', { data: '2027-12-01' }, /data fora do intervalo/],
  ])('recusa %s', (_, campos, motivo) => {
    const resposta = chamar('lancar', { linhas: [{ ...SALGADO, ...campos }] });
    expect(resposta.ok || resposta.error.message).toMatch(motivo);
  });

  it('descrição que parece fórmula vira texto, e a versão continua a mesma ao listar', () => {
    const linha = { ...SALGADO, descricao: '=IMPORTXML("x")' };
    const lancado = dados(chamar('lancar', { linhas: [linha] })).linhas[0];
    expect(linhasGravadas()[0]?.descricao).toBe('=IMPORTXML("x")');
    const listado = dados(chamar('listar', { de: '2026-11-01', ate: '2026-11-01' })).linhas[0];
    expect(listado.versao).toBe(lancado.versao);
  });
});

describe('editar e conflito', () => {
  function lancarPrevisto() {
    const previsto = { ...SALGADO, tipo: 'saida', status: 'previsto', valorCentavos: 180000 };
    return dados(chamar('lancar', { linhas: [previsto] })).linhas[0];
  }

  it('confirma um previsto ajustando o valor, com nova versão', () => {
    const antes = lancarPrevisto();
    const { linha } = dados(
      chamar('editar', {
        id: ID(1),
        versaoVista: antes.versao,
        status: 'confirmado',
        valorCentavos: 185000,
      }),
    );
    expect(linha).toMatchObject({ status: 'confirmado', valorCentavos: 185000 });
    expect(linha.versao).not.toBe(antes.versao);
    expect(linhasGravadas()[0]).toMatchObject({ status: 'confirmado', valor: 1850 });
  });

  it('edição manual na planilha depois da leitura gera CONFLICT e não sobrescreve', () => {
    const antes = lancarPrevisto();
    planilha.editarAMao(ABAS.lancamentos, ID(1), { valor: 1900 });
    const resposta = chamar('editar', {
      id: ID(1),
      versaoVista: antes.versao,
      status: 'confirmado',
    });
    expect(resposta).toMatchObject({ error: { code: 'CONFLICT' } });
    expect(linhasGravadas()[0]).toMatchObject({ valor: 1900, status: 'previsto' });
  });

  it('valida a linha já mesclada pelas regras do domínio', () => {
    const antes = lancarPrevisto();
    const resposta = chamar('editar', { id: ID(1), versaoVista: antes.versao, meio: 'cartao' });
    expect(resposta.ok || resposta.error.message).toBe('meio cartão sem cartão');
  });

  it('id desconhecido é NOT_FOUND', () => {
    const resposta = chamar('editar', { id: ID(7), versaoVista: 'x', status: 'confirmado' });
    expect(resposta).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });
});

describe('excluir', () => {
  it('só esta: exclusão lógica, some do listar', () => {
    const { versao } = dados(chamar('lancar', { linhas: [SALGADO] })).linhas[0];
    expect(dados(chamar('excluir', { id: ID(1), versaoVista: versao, escopo: 'so_esta' }))).toEqual(
      {
        excluidos: [ID(1)],
      },
    );
    expect(linhasGravadas()[0]?.excluido).toBe(true);
    expect(dados(chamar('listar', { de: '2026-11-01', ate: '2026-11-30' })).linhas).toEqual([]);
  });

  it('esta e as próximas: pula parcela à vista já confirmada', () => {
    // Parcelado à vista em 3×: a 2ª já foi paga (confirmada) e não pode mudar.
    const parcela = (n: number, data: string, status: string) => ({
      ...SALGADO,
      id: ID(n),
      data,
      status,
      grupoId: ID(99),
      parcelaN: n,
      parcelas: 3,
    });
    const linhas = [
      parcela(1, '2026-11-01', 'confirmado'),
      parcela(2, '2026-12-01', 'confirmado'),
      parcela(3, '2027-01-01', 'previsto'),
    ];
    const gravadas = dados(chamar('lancar', { linhas })).linhas;
    const resposta = chamar('excluir', {
      id: ID(1),
      versaoVista: gravadas[0].versao,
      escopo: 'esta_e_proximas',
    });
    expect(dados(resposta).excluidos).toEqual([ID(1), ID(3)]);
  });
});

describe('listar', () => {
  it('filtra pelo intervalo e ordena por data', () => {
    chamar('lancar', {
      linhas: [
        { ...SALGADO, id: ID(1), data: '2026-11-03' },
        { ...SALGADO, id: ID(2), data: '2026-11-01' },
        { ...SALGADO, id: ID(3), data: '2026-12-01' },
      ],
    });
    const { linhas } = dados(chamar('listar', { de: '2026-11-01', ate: '2026-11-30' }));
    expect(linhas.map((l: { id: string }) => l.id)).toEqual([ID(2), ID(1)]);
  });

  it('"de" depois de "ate" é inválido', () => {
    const resposta = chamar('listar', { de: '2026-11-30', ate: '2026-11-01' });
    expect(resposta).toMatchObject({ error: { code: 'INVALID_PAYLOAD' } });
  });
});

describe('referencias e resumo', () => {
  it('referencias traz categorias, cartões ativos, previsão do mês e limites', () => {
    planilha.acrescentar(ABAS.previsao, [{ mes: '2026-11', diario_por_dia: 30 }]);
    const ref = dados(chamar('referencias', null));
    expect(ref.categorias.gasto).toHaveLength(16);
    expect(ref.cartoes).toEqual([{ id: 'INTER', nome: 'Cartão Murilo (Inter)', dono: 'Murilo' }]);
    expect(ref.previsao).toEqual({ mes: '2026-11', diarioPorDiaCentavos: 3000 });
    expect(ref.limites).toEqual({
      valorMaximoCentavos: 2_000_000,
      confirmarAcimaDiarioCentavos: 200_000,
    });
  });

  it('resumo lê saldo e Diário das células e calcula consumo e totais', () => {
    planilha.atualizar(ABAS.config, 5, { valor: new Date(2026, 9, 24) });
    planilha.acrescentar(ABAS.previsao, [{ mes: '2026-11', diario_por_dia: 30 }]);
    const valores = Array.from({ length: 31 }, (_, i) => [i + 1, 0, 0, 30, 5000 - i * 10]);
    const formulas = Array.from({ length: 31 }, () => ['', '=E', '=S', '=D', '=SALDO']);
    formulas[4] = ['', '', '=S', '=D', '=SALDO'];
    planilha.blocos.set('2026-11', { valores, formulas });
    chamar('lancar', {
      linhas: [
        SALGADO,
        { ...SALGADO, id: ID(2), tipo: 'saida', categoria: 'Casa', valorCentavos: 180000 },
      ],
    });

    const r = dados(chamar('resumo', { data: '2026-11-01' }));
    expect(r).toMatchObject({
      saldoDoDiaCentavos: 500000,
      menorSaldoDoMes: { data: '2026-11-30', saldoCentavos: 471000 },
      diarioCaixaCentavos: 3000,
      consumoDoDiarioCentavos: 800,
      previsaoCentavos: 3000,
      totaisDoMes: { entrada: 0, saida: 180000, diario: 800, estorno: 0 },
      gastosPorCategoria: [
        { categoria: 'Casa', centavos: 180000 },
        { categoria: 'Alimentação', centavos: 800 },
      ],
      celulasSemFormula: 1,
    });
  });

  it('resumo de um mês sem aba devolve saldos nulos', () => {
    const r = dados(chamar('resumo', { data: '2026-11-01' }));
    expect(r).toMatchObject({
      saldoDoDiaCentavos: null,
      menorSaldoDoMes: null,
      celulasSemFormula: 0,
    });
  });
});

describe('trava da planilha real', () => {
  it('sem permissão, escrita é recusada e leitura continua', () => {
    ambiente.podeEscrever = false;
    expect(chamar('lancar', { linhas: [SALGADO] })).toMatchObject({
      error: { code: 'INTERNAL', message: 'Escrita bloqueada nesta planilha' },
    });
    expect(chamar('listar', { de: '2026-11-01', ate: '2026-11-30' }).ok).toBe(true);
    expect(linhasGravadas()).toHaveLength(0);
  });
});
