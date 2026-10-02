// Renderiza o app inteiro com o núcleo de verdade sobre o script falso, para
// testar as telas como o usuário as usa.
import { signal } from '@angular/core';
import { AppState, Dialogs } from '@ng-native/device';
import { Network } from '@ng-native/expo/network';
import { render } from '@ng-native/testing';
import { vi } from 'vitest';
import { AgendadorFalso, ApiFalsa, TOKEN_BOM } from '../aplicacao/api-falsa.fixture.ts';
import { ArmazemEmMemoria } from '../aplicacao/armazem-em-memoria.ts';
import { HOJE } from '../aplicacao/dados.fixture.ts';
import { NADA_GUARDADO } from '../aplicacao/guardado.ts';
import { Termometro } from '../aplicacao/termometro.ts';
import { App } from './app.ts';
import { TERMOMETRO } from './estado-do-app.ts';

export async function renderizarApp(opcoes: { token?: string | null; online?: boolean } = {}) {
  const api = new ApiFalsa();
  const conectado = signal(opcoes.online ?? true);
  let token = opcoes.token === undefined ? TOKEN_BOM : opcoes.token;
  let n = 0;
  const termometro = new Termometro({
    api,
    // Com token, o primeiro acesso já aconteceu e guardou o nome do dono.
    armazem: new ArmazemEmMemoria(token ? { ...NADA_GUARDADO, dono: 'Thays' } : NADA_GUARDADO),
    cofre: {
      lerToken: async () => token,
      guardarToken: async (novo) => {
        token = novo;
      },
    },
    relogio: { hoje: () => HOJE, agora: () => ++n },
    agendador: new AgendadorFalso(),
    novoId: () => `id-${String(++n).padStart(8, '0')}`,
  });
  const dialogs = {
    confirm: vi.fn(async () => true),
    choose: vi.fn(async (): Promise<number | null> => 0),
  };
  await render(App, {
    providers: [
      { provide: TERMOMETRO, useValue: termometro },
      { provide: Network, useValue: { connected: conectado } },
      { provide: AppState, useValue: { active: signal(true) } },
      { provide: Dialogs, useValue: dialogs },
    ],
  });
  return { api, termometro, conectado, dialogs };
}
