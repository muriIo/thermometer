import { Component, inject } from '@angular/core';
import { SafeAreaProvider, SafeAreaView, Text, View } from '@ng-native/components';
import { StatusBar } from '@ng-native/device';
import { centavos, formatarReais } from '@termometro/dominio';

/**
 * Tela provisória enquanto a Fase 4 não tem as telas do PROJECT.md (seção 10). Usa o domínio só
 * para provar que o pacote do workspace chega ao app pelo Metro.
 */
@Component({
  imports: [SafeAreaProvider, SafeAreaView, Text, View],
  selector: 'app-root',
  template: `
    <safe-area-provider>
      <safe-area-view class="tela">
        <view class="corpo">
          <text class="titulo">Termômetro</text>
          <text class="valor">{{ saldo }}</text>
          <text class="dica">Em construção (Fase 4).</text>
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
  protected readonly saldo = formatarReais(centavos(0));

  constructor() {
    inject(StatusBar).set({ style: 'dark' });
  }
}
