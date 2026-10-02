import { Component, computed, inject } from '@angular/core';
import { SafeAreaProvider, SafeAreaView, Text, View } from '@ng-native/components';
import { StatusBar } from '@ng-native/device';
import { centavos, formatarReais } from '@termometro/dominio';
import { EstadoDoApp } from './estado-do-app.ts';

/**
 * Tela provisória enquanto a Fase 4 não tem as telas do PROJECT.md (seção 10).
 * Mostra o estado do núcleo para conferir no aparelho que banco, cofre e rede
 * estão ligados.
 */
@Component({
  imports: [SafeAreaProvider, SafeAreaView, Text, View],
  selector: 'app-root',
  template: `
    <safe-area-provider>
      <safe-area-view class="tela">
        <view class="corpo">
          <text class="titulo">Termômetro</text>
          <text class="valor">{{ saldo() }}</text>
          <text class="dica">{{ situacao() }}</text>
        </view>
      </safe-area-view>
    </safe-area-provider>
  `,
  styles: `
    :host {
      flex: 1;
    }
    .tela {
      flex: 1;
      background-color: #f7f7f5;
    }
    .corpo {
      flex: 1;
      justify-content: center;
      gap: 12px;
      padding: 24px;
    }
    .titulo {
      color: #15171c;
      font-size: 28px;
      font-weight: 700;
    }
    .valor {
      color: #15171c;
      font-size: 22px;
    }
    .dica {
      color: #5b6070;
      font-size: 15px;
    }
  `,
})
export class App {
  private readonly app = inject(EstadoDoApp);

  protected readonly saldo = computed(() => {
    const saldo = this.app.painel().saldo;
    return saldo ? formatarReais(centavos(saldo.centavos)) : '—';
  });

  protected readonly situacao = computed(() => {
    const { fase, online, fila } = this.app.estado();
    const rede = online ? 'online' : 'sem rede';
    return `${fase} · ${rede} · ${fila.length} na fila`;
  });

  constructor() {
    inject(StatusBar).set({ style: 'dark' });
  }
}
