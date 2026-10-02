import {
  computed,
  DestroyRef,
  effect,
  InjectionToken,
  inject,
  Service,
  signal,
} from '@angular/core';
import { AppState } from '@ng-native/device';
import { Network } from '@ng-native/expo/network';
import { painelDeHoje } from '../aplicacao/painel.ts';
import type { Termometro } from '../aplicacao/termometro.ts';

/** O núcleo, montado em `main.ts` com as portas do aparelho. */
export const TERMOMETRO = new InjectionToken<Termometro>('Termometro');

/**
 * O núcleo como signals para os templates. Avisa o núcleo quando a rede
 * muda e relê a planilha quando o app volta ao primeiro plano (PROJECT.md, 8.4).
 */
@Service()
export class EstadoDoApp {
  readonly termometro = inject(TERMOMETRO);
  private readonly atual = signal(this.termometro.estado);
  readonly estado = this.atual.asReadonly();
  readonly painel = computed(() => painelDeHoje(this.atual()));

  constructor() {
    const network = inject(Network);
    const appState = inject(AppState);
    inject(DestroyRef).onDestroy(this.termometro.assinar((estado) => this.atual.set(estado)));

    effect(() => this.termometro.definirOnline(network.connected()));
    let estavaAtivo = appState.active();
    effect(() => {
      const ativo = appState.active();
      if (ativo && !estavaAtivo) void this.termometro.atualizar();
      estavaAtivo = ativo;
    });

    void this.termometro.iniciar();
  }
}
