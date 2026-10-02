import { dataISO } from '@termometro/dominio';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgendadorFalso, ApiFalsa, TOKEN_BOM } from './api-falsa.fixture.ts';
import { ArmazemEmMemoria } from './armazem-em-memoria.ts';
import { HOJE } from './dados.fixture.ts';
import { painelDeHoje } from './painel.ts';
import type { Cofre } from './portas.ts';
import { projetar } from './projecao.ts';
import type { Rascunho } from './rascunho.ts';
import { Termometro } from './termometro.ts';

const SALGADO: Rascunho = {
  data: HOJE,
  valorCentavos: 800,
  tipo: 'diario',
  categoria: 'Alimentação',
  descricao: 'Salgado',
  quem: 'Thays',
  meio: 'avista',
};

class CofreFalso implements Cofre {
  constructor(public token: string | null = null) {}
  lerToken() {
    return Promise.resolve(this.token);
  }
  guardarToken(token: string) {
    this.token = token;
    return Promise.resolve();
  }
}

let api: ApiFalsa;
let armazem: ArmazemEmMemoria;
let cofre: CofreFalso;
let agendador: AgendadorFalso;

function novoTermometro(): Termometro {
  let n = 0;
  return new Termometro({
    api,
    armazem,
    cofre,
    agendador,
    relogio: { hoje: () => HOJE, agora: () => ++n },
    novoId: () => `id-${String(++n).padStart(8, '0')}-${Math.random().toString(36).slice(2, 8)}`,
  });
}

/** Termômetro já conectado e online, com a planilha lida. */
async function conectado(): Promise<Termometro> {
  cofre.token = TOKEN_BOM;
  const t = novoTermometro();
  await t.iniciar();
  t.definirOnline(true);
  await t.ocioso();
  return t;
}

async function lancado(t: Termometro, rascunho: Rascunho = SALGADO): Promise<readonly string[]> {
  const resultado = await t.lancar(rascunho);
  if (!resultado.ok) throw new Error(resultado.problema);
  return resultado.ids;
}

const naTela = (t: Termometro) => projetar(t.estado.espelho, t.estado.fila, t.estado.emEnvio);

beforeEach(() => {
  api = new ApiFalsa();
  armazem = new ArmazemEmMemoria();
  cofre = new CofreFalso();
  agendador = new AgendadorFalso();
});

describe('primeiro acesso', () => {
  it('sem token, pede o token; token recusado não conecta', async () => {
    const t = novoTermometro();
    await t.iniciar();
    expect(t.estado.fase).toBe('sem-token');

    const resultado = await t.conectar('token-errado');

    expect(resultado).toEqual({ ok: false, problema: expect.stringContaining('Token') });
    expect(cofre.token).toBeNull();
  });

  it('token aceito: guarda no cofre, mostra o nome do ping e lê a planilha', async () => {
    const t = novoTermometro();
    await t.iniciar();
    t.definirOnline(true);

    expect(await t.conectar(TOKEN_BOM)).toEqual({ ok: true });
    await t.ocioso();

    expect(cofre.token).toBe(TOKEN_BOM);
    expect(t.estado).toMatchObject({ fase: 'pronto', dono: 'Thays' });
    expect(t.estado.referencias?.cartoes).toHaveLength(1);
    expect(t.estado.resumo?.resumo.saldoDoDiaCentavos).toBe(100_000);
  });

  it('sem rede no primeiro acesso, explica em vez de recusar o token', async () => {
    api.offline = true;
    const t = novoTermometro();
    await t.iniciar();
    expect(await t.conectar(TOKEN_BOM)).toEqual({
      ok: false,
      problema: expect.stringContaining('internet'),
    });
  });
});

describe('lançar', () => {
  it('aparece na hora como pendente e, enviado, fica uma vez na planilha', async () => {
    const t = await conectado();
    const soltar = api.segurar();

    const [id] = await lancado(t);
    await vi.waitFor(() => expect(api.chamadas).toContain('lancar'));
    expect(naTela(t).find((l) => l.id === id)?.situacao).toBe('enviando');

    soltar();
    await t.ocioso();

    expect(api.ativas().map((l) => l.id)).toEqual([id]);
    expect(t.estado.fila).toEqual([]);
    expect(naTela(t).find((l) => l.id === id)?.situacao).toBe('sincronizado');
  });

  it('rascunho inválido não entra na fila', async () => {
    const t = await conectado();
    const resultado = await t.lancar({ ...SALGADO, valorCentavos: 0 });
    expect(resultado.ok).toBe(false);
    expect(t.estado.fila).toEqual([]);
  });

  it('modo avião: guarda, estima o saldo e, com a rede de volta, envia cada um uma vez', async () => {
    const t = await conectado();
    t.definirOnline(false);
    api.offline = true;

    await lancado(t);
    await lancado(t, { ...SALGADO, valorCentavos: 1200, descricao: 'Café' });

    expect(api.ativas()).toEqual([]);
    expect(painelDeHoje(t.estado)).toMatchObject({
      pendentes: 2,
      consumoCentavos: 2000,
      saldo: { centavos: 98_000, estimado: true },
    });

    api.offline = false;
    t.definirOnline(true);
    await t.ocioso();

    expect(
      api
        .ativas()
        .map((l) => l.valorCentavos)
        .sort(),
    ).toEqual([1200, 800]);
    expect(painelDeHoje(t.estado)).toMatchObject({
      pendentes: 0,
      consumoCentavos: 2000,
      saldo: { centavos: 100_000, estimado: false },
    });
  });

  it('fila sobrevive a fechar o app: outro início envia o que ficou', async () => {
    const t = await conectado();
    t.definirOnline(false);
    const [id] = await lancado(t);

    const depois = novoTermometro();
    await depois.iniciar();
    expect(depois.estado.fila).toHaveLength(1);
    depois.definirOnline(true);
    await depois.ocioso();

    expect(api.ativas().map((l) => l.id)).toEqual([id]);
  });

  it('resposta perdida: tenta de novo mais tarde, sem duplicar', async () => {
    const t = await conectado();
    api.cair('depois');

    await lancado(t);
    await t.ocioso();

    expect(api.ativas()).toHaveLength(1);
    expect(t.estado.fila[0]).toMatchObject({ tentativas: 1, ultimoErro: 'timeout' });
    expect(agendador.atrasos).toEqual([2000]);

    agendador.dispararTudo();
    await t.ocioso();

    expect(api.ativas()).toHaveLength(1);
    expect(t.estado.fila).toEqual([]);
  });

  it('cada falha seguida dobra a espera', async () => {
    const t = await conectado();
    api.cair('antes', 'antes');
    await lancado(t);
    await t.ocioso();
    agendador.dispararTudo();
    await t.ocioso();
    expect(agendador.atrasos).toEqual([4000]);
  });

  it('parcelado vai numa operação só e chega inteiro', async () => {
    const t = await conectado();
    const ids = await lancado(t, {
      ...SALGADO,
      valorCentavos: 30_000,
      meio: 'cartao',
      cartao: 'INTER',
      parcelas: 3,
    });
    await t.ocioso();
    expect(ids).toHaveLength(3);
    expect(api.ativas()).toHaveLength(3);
  });

  it('recusado pelo script: trava à vista, não some, e não segura os outros', async () => {
    const t = await conectado();
    t.definirOnline(false);
    api.errosForcados.set('lancar', 'INVALID_PAYLOAD');
    const [recusado] = await lancado(t);
    const [aceito] = await lancado(t, { ...SALGADO, descricao: 'Outro' });

    t.definirOnline(true);
    await t.ocioso();

    expect(api.ativas().map((l) => l.id)).toEqual([aceito]);
    expect(naTela(t).find((l) => l.id === recusado)?.situacao).toBe('travado');
    expect(t.estado.avisos).toHaveLength(1);

    const travada = t.estado.fila[0];
    if (!travada) throw new Error('fila vazia');
    await t.descartar(travada.opId);
    expect(t.estado.fila).toEqual([]);
  });

  it('token revogado: a fila para e espera reconectar', async () => {
    const t = await conectado();
    api.tokens.clear();

    await lancado(t);
    await t.ocioso();

    expect(t.estado.bloqueio).toBe('token');
    expect(t.estado.fila).toHaveLength(1);
    expect(agendador.atrasos).toEqual([]);
  });
});

describe('desfazer', () => {
  it('ainda na fila: só sai da fila, nada chega à planilha', async () => {
    const t = await conectado();
    t.definirOnline(false);
    const [id] = await lancado(t);

    await t.desfazer(id as string);
    t.definirOnline(true);
    await t.ocioso();

    expect(t.estado.fila).toEqual([]);
    expect(api.chamadas).not.toContain('lancar');
  });

  it('já enviado: exclui na planilha', async () => {
    const t = await conectado();
    const [id] = await lancado(t);
    await t.ocioso();

    await t.desfazer(id as string);
    await t.ocioso();

    expect(api.ativas()).toEqual([]);
    expect(naTela(t)).toEqual([]);
  });

  it('durante o envio: a exclusão espera o lançamento e usa a versão que ele devolveu', async () => {
    const t = await conectado();
    const soltar = api.segurar();
    const [id] = await lancado(t);
    await vi.waitFor(() => expect(api.chamadas).toContain('lancar'));

    await t.desfazer(id as string);
    soltar();
    await t.ocioso();

    expect(api.linhas.get(id as string)?.excluido).toBe(true);
    expect(t.estado.fila).toEqual([]);
  });

  it('parcelado enviado: exclui todas as parcelas', async () => {
    const t = await conectado();
    const ids = await lancado(t, { ...SALGADO, valorCentavos: 900, parcelas: 3 });
    await t.ocioso();

    await t.desfazer(ids[2] as string);
    await t.ocioso();

    expect(api.ativas()).toEqual([]);
  });

  it('exclusão com resposta perdida: o reenvio vê que já foi e conclui', async () => {
    const t = await conectado();
    const [id] = await lancado(t);
    await t.ocioso();
    api.cair('depois');

    await t.desfazer(id as string);
    await t.ocioso();
    agendador.dispararTudo();
    await t.ocioso();

    expect(t.estado.fila).toEqual([]);
    expect(t.estado.avisos).toEqual([]);
  });
});

describe('confirmar previsto', () => {
  async function comPrevisto(): Promise<{ t: Termometro; id: string }> {
    const t = await conectado();
    const [id] = await lancado(t, { ...SALGADO, tipo: 'saida', valorCentavos: 150_000 });
    await t.ocioso();
    api.editarAMao(id as string, { status: 'previsto' });
    await t.atualizar();
    return { t, id: id as string };
  }

  it('confirma com valor ajustado', async () => {
    const { t, id } = await comPrevisto();
    expect(painelDeHoje(t.estado).aConfirmar.map((l) => l.id)).toEqual([id]);

    await t.confirmar(id, { valorCentavos: 152_000 });
    await t.ocioso();

    expect(api.linhas.get(id)).toMatchObject({ status: 'confirmado', valorCentavos: 152_000 });
    expect(painelDeHoje(t.estado).aConfirmar).toEqual([]);
  });

  it('resposta perdida: o CONFLICT do reenvio é reconhecido como já aplicado', async () => {
    const { t, id } = await comPrevisto();
    api.cair('depois');

    await t.confirmar(id);
    await t.ocioso();
    agendador.dispararTudo();
    await t.ocioso();

    expect(api.linhas.get(id)?.status).toBe('confirmado');
    expect(t.estado.fila).toEqual([]);
    expect(t.estado.avisos).toEqual([]);
  });

  it('mudou na planilha depois de lido: não sobrescreve e avisa', async () => {
    const { t, id } = await comPrevisto();
    api.editarAMao(id, { valorCentavos: 149_000 as never });

    await t.confirmar(id);
    await t.ocioso();

    expect(api.linhas.get(id)).toMatchObject({ status: 'previsto', valorCentavos: 149_000 });
    expect(t.estado.fila).toEqual([]);
    expect(t.estado.avisos).toHaveLength(1);
    expect(naTela(t).find((l) => l.id === id)?.valorCentavos).toBe(149_000);
  });

  it('excluído na planilha: tira da tela e avisa', async () => {
    const { t, id } = await comPrevisto();
    api.editarAMao(id, { excluido: true });

    await t.confirmar(id);
    await t.ocioso();

    expect(naTela(t).find((l) => l.id === id)).toBeUndefined();
    expect(t.estado.avisos).toHaveLength(1);
  });

  it('editar um lançamento ainda na fila muda a própria operação', async () => {
    const t = await conectado();
    t.definirOnline(false);
    const [id] = await lancado(t);

    await t.editar(id as string, { valorCentavos: 900, data: dataISO('2026-11-04') });

    expect(t.estado.fila).toHaveLength(1);
    t.definirOnline(true);
    await t.ocioso();
    expect(api.linhas.get(id as string)).toMatchObject({ valorCentavos: 900, data: '2026-11-04' });
  });
});

describe('leitura da planilha', () => {
  it('a planilha vence: linha apagada à mão some da tela no próximo atualizar', async () => {
    const t = await conectado();
    const [id] = await lancado(t);
    await t.ocioso();

    api.editarAMao(id as string, { excluido: true });
    await t.atualizar();

    expect(naTela(t)).toEqual([]);
  });

  it('pendente não some quando a planilha é relida', async () => {
    const t = await conectado();
    api.cair('antes', 'antes');
    const [id] = await lancado(t);
    await t.ocioso();
    const leiturasAntes = api.chamadas.filter((c) => c === 'listar').length;

    await t.atualizar();

    expect(api.chamadas.filter((c) => c === 'listar')).toHaveLength(leiturasAntes + 1);
    expect(naTela(t).map((l) => [l.id, l.situacao])).toEqual([[id, 'pendente']]);
  });
});
