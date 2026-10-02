import { signal } from '@angular/core';
import { AppState } from '@ng-native/device';
import { Network } from '@ng-native/expo/network';
import { render, screen } from '@ng-native/testing';
import { expect, test } from 'vitest';
import { AgendadorFalso, ApiFalsa } from '../aplicacao/api-falsa.fixture.ts';
import { ArmazemEmMemoria } from '../aplicacao/armazem-em-memoria.ts';
import { HOJE } from '../aplicacao/dados.fixture.ts';
import { Termometro } from '../aplicacao/termometro.ts';
import { App } from './app.ts';
import { TERMOMETRO } from './estado-do-app.ts';

test('sem token, mostra que falta conectar', async () => {
  const termometro = new Termometro({
    api: new ApiFalsa(),
    armazem: new ArmazemEmMemoria(),
    cofre: { lerToken: async () => null, guardarToken: async () => {} },
    relogio: { hoje: () => HOJE, agora: () => 0 },
    agendador: new AgendadorFalso(),
    novoId: () => 'id-00000001',
  });

  await render(App, {
    providers: [
      { provide: TERMOMETRO, useValue: termometro },
      { provide: Network, useValue: { connected: signal(false) } },
      { provide: AppState, useValue: { active: signal(true) } },
    ],
  });

  expect(screen.getByText('Termômetro')).toBeTruthy();
  expect(await screen.findByText('sem-token · sem rede · 0 na fila')).toBeTruthy();
});
