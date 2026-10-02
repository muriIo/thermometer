import { Component, computed, input, output, signal } from '@angular/core';
import { Modal, Pressable, SafeAreaView, Text, TextInput, View } from '@ng-native/components';
import { NgIcon } from '@ng-native/icons';
import { centavos, type DataISO, formatarReais, somarDias } from '@termometro/dominio';
import type { LancamentoNaTela } from '../aplicacao/projecao.ts';
import { centavosDoTeclado, dataCurta, filtrarValor, textoDoValor } from './formatos.ts';

/** Toque longo num "A confirmar": confirma com outro valor ou outra data (PROJECT.md, 10, tela 1). */
@Component({
  selector: 'app-ajustar-previsto',
  imports: [Modal, NgIcon, Pressable, SafeAreaView, Text, TextInput, View],
  template: `
    <modal animationType="slide" presentationStyle="pageSheet" (requestClose)="fechar.emit()">
      <safe-area-view class="tela">
        <view class="topo">
          <pressable class="redondo" accessibilityRole="button" accessibilityLabel="Fechar" (press)="fechar.emit()">
            <ng-icon name="lucide-x" [size]="20" color="#15171C" />
          </pressable>
          <text class="titulo" accessibilityRole="header">Confirmar previsto</text>
          <view class="redondo-vazio"></view>
        </view>
        <text class="nome">{{ previsto().descricao || previsto().categoria }}</text>

        <text class="rotulo">Valor (R$)</text>
        <text-input
          class="entrada"
          accessibilityLabel="Valor"
          keyboardType="decimal-pad"
          [value]="valor()"
          (changeText)="valor.set(filtrar($event))"
        />

        <text class="rotulo">Data</text>
        <view class="datas">
          <pressable class="redondo" accessibilityRole="button" accessibilityLabel="Dia anterior" (press)="mudarDia(-1)">
            <ng-icon name="lucide-chevron-left" [size]="20" color="#15171C" />
          </pressable>
          <text class="data">{{ dataTexto() }}</text>
          <pressable class="redondo" accessibilityRole="button" accessibilityLabel="Dia seguinte" (press)="mudarDia(1)">
            <ng-icon name="lucide-chevron-right" [size]="20" color="#15171C" />
          </pressable>
        </view>

        <pressable
          class="botao"
          accessibilityRole="button"
          [accessibilityState]="{ disabled: centavosDigitados() <= 0 }"
          [disabled]="centavosDigitados() <= 0"
          (press)="confirmar()"
        >
          <text class="botao-texto">Confirmar {{ reais() }}</text>
        </pressable>
      </safe-area-view>
    </modal>
  `,
  styles: `
    .tela {
      flex: 1;
      background-color: #ffffff;
      padding: 16px 20px 24px;
      gap: 12px;
    }
    .topo {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
    .titulo {
      font-size: 17px;
      font-weight: 700;
      color: #15171c;
    }
    .redondo {
      width: 44px;
      height: 44px;
      border-radius: 22px;
      background-color: #f1f1ee;
      align-items: center;
      justify-content: center;
    }
    .redondo-vazio {
      width: 44px;
    }
    .nome {
      font-size: 22px;
      font-weight: 700;
      color: #15171c;
    }
    .rotulo {
      font-size: 14px;
      font-weight: 600;
      color: #5b6070;
    }
    .entrada {
      height: 52px;
      border-radius: 12px;
      border-width: 1.5px;
      border-color: #15171c;
      padding: 0 14px;
      font-size: 20px;
      color: #15171c;
    }
    .datas {
      flex-direction: row;
      align-items: center;
      gap: 16px;
    }
    .data {
      flex: 1;
      text-align: center;
      font-size: 17px;
      font-weight: 600;
      color: #15171c;
    }
    .botao {
      margin-top: auto;
      min-height: 56px;
      border-radius: 16px;
      background-color: #15171c;
      align-items: center;
      justify-content: center;
    }
    .botao-texto {
      color: #ffffff;
      font-size: 17px;
      font-weight: 700;
    }
  `,
})
export class AjustarPrevisto {
  readonly previsto = input.required<LancamentoNaTela>();
  readonly confirmado = output<{ valorCentavos: number; data: DataISO }>();
  readonly fechar = output();

  protected readonly valor = signal('');
  private readonly deslocamento = signal(0);

  protected readonly centavosDigitados = computed(() => centavosDoTeclado(this.valor()));
  protected readonly reais = computed(() => formatarReais(centavos(this.centavosDigitados())));
  private readonly data = computed(() => somarDias(this.previsto().data, this.deslocamento()));
  protected readonly dataTexto = computed(() => dataCurta(this.data()));

  ngOnInit(): void {
    this.valor.set(textoDoValor(this.previsto().valorCentavos));
  }

  protected filtrar(texto: string): string {
    return filtrarValor(texto);
  }

  protected mudarDia(dias: number): void {
    this.deslocamento.update((atual) => atual + dias);
  }

  protected confirmar(): void {
    if (this.centavosDigitados() <= 0) return;
    this.confirmado.emit({ valorCentavos: this.centavosDigitados(), data: this.data() });
  }
}
