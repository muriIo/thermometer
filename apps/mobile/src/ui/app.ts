import { Component, computed, inject } from '@angular/core';
import { SafeAreaProvider } from '@ng-native/components';
import { StatusBar } from '@ng-native/device';
import { EstadoDoApp } from './estado-do-app.ts';
import { Hoje } from './hoje.ts';
import { ICONES } from './icones.ts';
import { PrimeiroAcesso } from './primeiro-acesso.ts';

/**
 * Raiz da UI. Sem token, ou com o token recusado, é o primeiro acesso (tela 0);
 * o que estava na fila continua guardado e sai depois de reconectar.
 */
@Component({
  selector: 'app-root',
  imports: [Hoje, PrimeiroAcesso, SafeAreaProvider],
  providers: [ICONES],
  host: { style: 'flex: 1' },
  template: `
    <safe-area-provider>
      @switch (tela()) {
        @case ('carregando') {}
        @case ('primeiro-acesso') {
          <app-primeiro-acesso />
        }
        @default {
          <app-hoje />
        }
      }
    </safe-area-provider>
  `,
})
export class App {
  private readonly app = inject(EstadoDoApp);

  protected readonly tela = computed(() => {
    const { fase, bloqueio } = this.app.estado();
    if (fase === 'carregando') return 'carregando';
    return fase === 'sem-token' || bloqueio === 'token' ? 'primeiro-acesso' : 'hoje';
  });

  constructor() {
    inject(StatusBar).set({ style: 'dark' });
  }
}
