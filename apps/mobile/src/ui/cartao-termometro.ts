import { Component, computed, input } from '@angular/core';
import { Text, View } from '@ng-native/components';
import { centavos, formatarReais } from '@termometro/dominio';

/** O termômetro (CONTEXT.md): consumo do Diário de hoje contra a previsão; laranja ao passar. */
@Component({
  selector: 'app-cartao-termometro',
  imports: [Text, View],
  template: `
    <view class="cartao" accessibilityRole="summary">
      <view class="topo">
        <text class="rotulo">Diário de hoje</text>
        <text class="previsto">{{ textoPrevisto() }}</text>
      </view>
      <text class="valor">{{ reais(consumo()) }}</text>
      <view class="barra">
        <view class="cheio" [style.width]="largura().dentro"></view>
        @if (largura().passou !== '0%') {
          <view class="passou" [style.width]="largura().passou"></view>
        }
      </view>
      @if (diferenca(); as d) {
        <text class="nota" [class.acima]="d.acima">{{ d.texto }}</text>
      }
    </view>
  `,
  styles: `
    .cartao {
      background-color: #15171c;
      border-radius: 20px;
      padding: 18px 20px;
      gap: 10px;
    }
    .topo {
      flex-direction: row;
      justify-content: space-between;
      align-items: baseline;
    }
    .rotulo {
      font-size: 14px;
      color: #c9ccd4;
      font-weight: 600;
    }
    .previsto {
      font-size: 13px;
      color: #c9ccd4;
    }
    .valor {
      font-size: 46px;
      font-weight: 700;
      letter-spacing: -1px;
      color: #ffffff;
      font-variant-numeric: tabular-nums;
    }
    .barra {
      height: 10px;
      border-radius: 5px;
      background-color: #2c3039;
      flex-direction: row;
      gap: 2px;
      overflow: hidden;
    }
    .cheio {
      background-color: #ffffff;
    }
    .passou {
      background-color: #f97316;
    }
    .nota {
      font-size: 13px;
      color: #c9ccd4;
      font-weight: 600;
    }
    .nota.acima {
      color: #fdba8c;
    }
  `,
})
export class CartaoTermometro {
  readonly consumo = input.required<number>();
  readonly previsao = input.required<number | null>();

  protected reais(valor: number): string {
    return formatarReais(centavos(valor));
  }

  protected readonly textoPrevisto = computed(() => {
    const previsao = this.previsao();
    return previsao === null ? 'sem previsão' : `previsto ${this.reais(previsao)}`;
  });

  /** Até a previsão, a barra enche de branco; o que passa vira a parte laranja, na mesma escala. */
  protected readonly largura = computed(() => {
    const previsao = this.previsao();
    const consumo = Math.max(this.consumo(), 0);
    if (!previsao) return { dentro: '0%', passou: '0%' };
    const total = Math.max(consumo, previsao);
    const dentro = Math.min(consumo, previsao) / total;
    const passou = Math.max(consumo - previsao, 0) / total;
    return { dentro: `${Math.round(dentro * 100)}%`, passou: `${Math.round(passou * 100)}%` };
  });

  protected readonly diferenca = computed(() => {
    const previsao = this.previsao();
    if (previsao === null) return null;
    const diferenca = this.consumo() - previsao;
    if (diferenca > 0) return { texto: `${this.reais(diferenca)} acima do previsto`, acima: true };
    return { texto: `${this.reais(-diferenca)} até o previsto`, acima: false };
  });
}
