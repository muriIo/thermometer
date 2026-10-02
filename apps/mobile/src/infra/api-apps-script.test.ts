import { describe, expect, it } from 'vitest';
import { ApiAppsScript, type Buscar } from './api-apps-script.ts';

const URL_TESTE = 'https://script.google.com/macros/s/teste/exec';

function buscarQueResponde(status: number, corpo: string): Buscar & { pedidos: unknown[] } {
  const pedidos: unknown[] = [];
  const buscar = (url: string, init: unknown) => {
    pedidos.push({ url, init });
    return Promise.resolve({ status, text: () => Promise.resolve(corpo) });
  };
  return Object.assign(buscar, { pedidos });
}

describe('ApiAppsScript', () => {
  it('envia o envelope do contrato por POST, com o token no corpo', async () => {
    const buscar = buscarQueResponde(200, JSON.stringify({ ok: true, data: { linhas: [] } }));
    const api = new ApiAppsScript(URL_TESTE, buscar);

    await api.chamar('listar', { de: '2026-11-01', ate: '2026-11-30' }, 'tk');

    const [pedido] = buscar.pedidos as { url: string; init: { method: string; body: string } }[];
    expect(pedido?.url).toBe(URL_TESTE);
    expect(pedido?.init.method).toBe('POST');
    expect(JSON.parse(pedido?.init.body ?? '')).toEqual({
      v: 1,
      token: 'tk',
      action: 'listar',
      payload: { de: '2026-11-01', ate: '2026-11-30' },
    });
  });

  it('sucesso devolve os dados', async () => {
    const api = new ApiAppsScript(
      URL_TESTE,
      buscarQueResponde(200, '{"ok":true,"data":{"excluidos":["a"]}}'),
    );
    expect(
      await api.chamar('excluir', { id: 'a', versaoVista: 'v', escopo: 'so_esta' }, 'tk'),
    ).toEqual({
      ok: true,
      dados: { excluidos: ['a'] },
    });
  });

  it('erro do contrato vira falha da api, com o código', async () => {
    const corpo = '{"ok":false,"error":{"code":"CONFLICT","message":"mudou"}}';
    const api = new ApiAppsScript(URL_TESTE, buscarQueResponde(200, corpo));
    expect(await api.chamar('ping', null, 'tk')).toEqual({
      ok: false,
      falha: { tipo: 'api', codigo: 'CONFLICT', mensagem: 'mudou' },
    });
  });

  it.each([
    ['página HTML do Google (cota, login)', 200, '<html>Erro</html>'],
    ['HTTP 500', 500, ''],
    ['JSON fora do contrato', 200, '{"resultado":1}'],
    ['código de erro desconhecido', 200, '{"ok":false,"error":{"code":"OUTRO","message":"x"}}'],
  ])('%s vira falha de rede: não se sabe se aplicou', async (_, status, corpo) => {
    const api = new ApiAppsScript(URL_TESTE, buscarQueResponde(status, corpo));
    const resultado = await api.chamar('ping', null, 'tk');
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.falha.tipo).toBe('rede');
  });

  it('exceção do fetch (sem rede) vira falha de rede', async () => {
    const api = new ApiAppsScript(URL_TESTE, () =>
      Promise.reject(new TypeError('Network request failed')),
    );
    expect(await api.chamar('ping', null, 'tk')).toEqual({
      ok: false,
      falha: { tipo: 'rede', mensagem: 'Network request failed' },
    });
  });

  it('demora além do limite: cancela e vira falha de rede', async () => {
    const pendurado: Buscar = (_url, init) =>
      new Promise((_resolver, rejeitar) => {
        init.signal.addEventListener('abort', () => rejeitar(new Error('aborted')));
      });
    const api = new ApiAppsScript(URL_TESTE, pendurado, 5);
    expect(await api.chamar('ping', null, 'tk')).toEqual({
      ok: false,
      falha: { tipo: 'rede', mensagem: 'sem resposta em 5 ms' },
    });
  });

  it('sem URL configurada, não tenta e explica', async () => {
    const api = new ApiAppsScript('', buscarQueResponde(200, '{}'));
    const resultado = await api.chamar('ping', null, 'tk');
    expect(resultado).toEqual({
      ok: false,
      falha: { tipo: 'rede', mensagem: expect.stringContaining('EXPO_PUBLIC_API_URL') },
    });
  });
});
