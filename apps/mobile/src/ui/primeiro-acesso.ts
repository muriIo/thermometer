import { Component, inject, signal } from '@angular/core';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from '@ng-native/components';
import { NgIcon } from '@ng-native/icons';
import { EstadoDoApp } from './estado-do-app.ts';

/**
 * Tela 0 (PROJECT.md, 10; 8.5): o token, colado. O `ping` confere e traz o
 * nome do dono; não há pergunta "quem usa este celular".
 */
@Component({
  selector: 'app-primeiro-acesso',
  imports: [
    ActivityIndicator,
    KeyboardAvoidingView,
    NgIcon,
    Pressable,
    SafeAreaView,
    Text,
    TextInput,
    View,
  ],
  host: { style: 'flex: 1' },
  template: `
    <safe-area-view class="tela">
      <keyboard-avoiding-view behavior="padding" class="corpo">
        <view class="marca">
          <ng-icon name="lucide-thermometer" [size]="32" color="#FFFFFF" />
        </view>
        <view class="cabeca">
          <text class="titulo" accessibilityRole="header">Termômetro</text>
          <text class="lead">Lance um gasto em segundos. Ele cai direto na planilha de vocês.</text>
        </view>

        <view class="campo">
          <text class="rotulo">Token de acesso</text>
          <text-input
            class="entrada"
            accessibilityLabel="Token de acesso"
            placeholder="Cole aqui o token que o Murilo enviou"
            placeholderTextColor="#8A8F9C"
            autoCapitalize="none"
            [autoCorrect]="false"
            [secureTextEntry]="true"
            [(value)]="token"
          />
          @if (problema(); as texto) {
            <text class="problema" accessibilityRole="alert">{{ texto }}</text>
          }
        </view>

        <pressable
          class="botao"
          accessibilityRole="button"
          accessibilityLabel="Conectar"
          [accessibilityState]="{ disabled: !podeConectar(), busy: conectando() }"
          [disabled]="!podeConectar()"
          [class.inativo]="!podeConectar()"
          (press)="conectar()"
        >
          @if (conectando()) {
            <activity-indicator size="small" color="#FFFFFF" />
          } @else {
            <text class="botao-texto">Conectar</text>
          }
        </pressable>
      </keyboard-avoiding-view>
    </safe-area-view>
  `,
  styles: `
    .tela {
      flex: 1;
      background-color: #f7f7f5;
    }
    .corpo {
      flex: 1;
      padding: 64px 24px 32px;
      gap: 20px;
    }
    .marca {
      width: 64px;
      height: 64px;
      border-radius: 20px;
      background-color: #15171c;
      align-items: center;
      justify-content: center;
    }
    .cabeca {
      gap: 8px;
    }
    .titulo {
      font-size: 40px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: #15171c;
    }
    .lead {
      font-size: 17px;
      line-height: 24px;
      color: #5b6070;
    }
    .campo {
      gap: 8px;
    }
    .rotulo {
      font-size: 15px;
      font-weight: 600;
      color: #15171c;
    }
    .entrada {
      height: 52px;
      border-radius: 14px;
      border-width: 1.5px;
      border-color: #15171c;
      background-color: #ffffff;
      padding: 0 14px;
      font-size: 16px;
      color: #15171c;
    }
    .problema {
      font-size: 14px;
      color: #b43c0a;
      font-weight: 600;
    }
    .botao {
      margin-top: auto;
      min-height: 56px;
      border-radius: 16px;
      background-color: #15171c;
      align-items: center;
      justify-content: center;
    }
    .botao.inativo {
      background-color: #8a8f9c;
    }
    .botao-texto {
      color: #ffffff;
      font-size: 17px;
      font-weight: 700;
    }
  `,
})
export class PrimeiroAcesso {
  private readonly app = inject(EstadoDoApp);
  protected readonly token = signal('');
  protected readonly conectando = signal(false);
  protected readonly problema = signal<string | null>(null);

  protected podeConectar(): boolean {
    return this.token().trim().length > 0 && !this.conectando();
  }

  protected async conectar(): Promise<void> {
    if (!this.podeConectar()) return;
    this.conectando.set(true);
    this.problema.set(null);
    const resultado = await this.app.termometro.conectar(this.token().trim());
    this.conectando.set(false);
    if (!resultado.ok) this.problema.set(resultado.problema);
  }
}
