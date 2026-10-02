import { signal } from '@angular/core';
import { AppState } from '@ng-native/device';
import { Network } from '@ng-native/expo/network';
import { injectService } from '@ng-native/testing';
import { describe, expect, it, vi } from 'vitest';
import { AgendadorFalso, ApiFalsa, TOKEN_BOM } from '../aplicacao/api-falsa.fixture.ts';
import { ArmazemEmMemoria } from '../aplicacao/armazem-em-memoria.ts';
import { HOJE } from '../aplicacao/dados.fixture.ts';
import { Termometro } from '../aplicacao/termometro.ts';
import { EstadoDoApp, TERMOMETRO } from './estado-do-app.ts';

function montar() {
  const api = new ApiFalsa();
  const conectado = signal(false);
  const ativo = signal(true);
  let n = 0;
  const termometro = new Termometro({
    api,
    armazem: new ArmazemEmMemoria(),
    cofre: { lerToken: async () => TOKEN_BOM, guardarToken: async () => {} },
    relogio: { hoje: () => HOJE, agora: () => ++n },
    agendador: new AgendadorFalso(),
    novoId: () => `id-${String(++n).padStart(8, '0')}`,
  });
  const estado = injectService(EstadoDoApp, {
    providers: [
      { provide: TERMOMETRO, useValue: termometro },
      { provide: Network, useValue: { connected: conectado } },
      { provide: AppState, useValue: { active: ativo } },
    ],
  });
  return { api, conectado, ativo, estado };
}

const leituras = (api: ApiFalsa) => api.chamadas.filter((c) => c === 'listar').length;

describe('EstadoDoApp', () => {
  it('inicia o núcleo e lê a planilha quando a rede aparece', async () => {
    const { api, conectado, estado } = montar();
    await vi.waitFor(() => expect(estado.estado().fase).toBe('pronto'));
    expect(leituras(api)).toBe(0);

    conectado.set(true);

    await vi.waitFor(() => expect(estado.estado().resumo).not.toBeNull());
    expect(estado.painel().saldo?.centavos).toBe(100_000);
  });

  it('relê a planilha ao voltar ao primeiro plano', async () => {
    const { api, conectado, ativo, estado } = montar();
    conectado.set(true);
    await vi.waitFor(() => expect(leituras(api)).toBe(1));
    await estado.termometro.ocioso();

    ativo.set(false);
    await new Promise((resolver) => setTimeout(resolver, 0));
    ativo.set(true);

    await vi.waitFor(() => expect(leituras(api)).toBe(2));
  });
});
