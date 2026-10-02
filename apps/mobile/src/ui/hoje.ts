import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from '@ng-native/components';
import { Dialogs } from '@ng-native/device';
import { NgIcon } from '@ng-native/icons';
import { centavos, type DataISO, formatarReais } from '@termometro/dominio';
import { alvos } from '../aplicacao/operacao.ts';
import type { LancamentoNaTela } from '../aplicacao/projecao.ts';
import { AjustarPrevisto } from './ajustar-previsto.ts';
import { CartaoTermometro } from './cartao-termometro.ts';
import { EstadoDoApp } from './estado-do-app.ts';
import { dataCurta, dataPorExtenso } from './formatos.ts';
import { type Lancado, Lancar } from './lancar.ts';
import { LinhaLancamento } from './linha-lancamento.ts';

/** Quanto tempo o "Desfazer" fica na tela depois de lançar (tela 3). */
const TEMPO_DO_DESFAZER_MS = 5000;

type Tom = 'ok' | 'enviando' | 'offline' | 'alerta';

/**
 * Tela 1, Hoje (PROJECT.md, 10), com a 3 (Lançado: toast "Desfazer") e a 3b
 * (sem internet: aviso dos guardados, saldo estimado) dentro dela.
 */
@Component({
  selector: 'app-hoje',
  imports: [
    AjustarPrevisto,
    CartaoTermometro,
    Lancar,
    LinhaLancamento,
    NgIcon,
    Pressable,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    Text,
    View,
  ],
  host: { style: 'flex: 1' },
  template: `
    <safe-area-view class="tela">
      <scroll-view class="rolagem" [contentContainerStyle]="{ padding: 20, paddingBottom: 120, gap: 16 }">
        <refresh-control [(refreshing)]="atualizando" (refresh)="atualizar()" />

        <view class="cabeca">
          <view class="cabeca-texto">
            <text class="data">{{ dataDeHoje() }}</text>
            <text class="titulo" accessibilityRole="header">Hoje</text>
          </view>
          <view [class]="'pilula tom-' + pilula().tom" accessibilityRole="text">
            <ng-icon [name]="pilula().icone" [size]="14" [color]="pilula().cor" [strokeWidth]="2.2" />
            <text class="pilula-texto" [style.color]="pilula().cor">{{ pilula().texto }}</text>
          </view>
        </view>

        @if (guardadosSemRede(); as n) {
          <view class="faixa" accessibilityRole="alert">
            <ng-icon name="lucide-clock" [size]="20" color="#9A4A00" />
            <text class="faixa-texto">
              <text class="forte">{{ n === 1 ? '1 lançamento guardado' : n + ' lançamentos guardados' }} no celular.</text>
              Eles vão para a planilha sozinhos quando a internet voltar.
            </text>
          </view>
        }

        @for (aviso of estado().avisos; track aviso.id) {
          <view class="faixa" accessibilityRole="alert">
            <ng-icon name="lucide-triangle-alert" [size]="20" color="#9A4A00" />
            <text class="faixa-texto">{{ aviso.texto }}</text>
            <pressable class="faixa-ok" accessibilityRole="button" accessibilityLabel="Dispensar aviso" (press)="dispensar(aviso.id)">
              <text class="faixa-ok-texto">OK</text>
            </pressable>
          </view>
        }

        <app-cartao-termometro [consumo]="painel().consumoCentavos" [previsao]="painel().previsaoCentavos" />

        <view class="pares">
          <view class="caixa">
            <text class="caixa-rotulo">Saldo do dia</text>
            <text class="caixa-valor">{{ saldo() }}</text>
            @if (painel().saldo?.estimado) {
              <text class="caixa-nota">estimado</text>
            }
          </view>
          <view class="caixa">
            <text class="caixa-rotulo">Menor saldo do mês</text>
            @if (painel().menorSaldoDoMes; as menor) {
              <text class="caixa-valor baixo">{{ reais(menor.saldoCentavos) }}</text>
              <text class="caixa-nota">dia {{ diaDe(menor.data) }}</text>
            } @else {
              <text class="caixa-valor">—</text>
            }
          </view>
        </view>

        @if (painel().aConfirmar.length > 0) {
          <view class="secao">
            <text class="secao-titulo" accessibilityRole="header">A confirmar</text>
            <text class="secao-dica">Toque para confirmar; segure para mudar valor ou data.</text>
            @for (previsto of painel().aConfirmar; track previsto.id) {
              <pressable
                accessibilityRole="button"
                [accessibilityLabel]="'Confirmar ' + (previsto.descricao || previsto.categoria) + ' de ' + curta(previsto.data)"
                accessibilityHint="Segure para mudar valor ou data"
                (press)="confirmar(previsto)"
                (longPress)="ajustando.set(previsto)"
              >
                <app-linha-lancamento [lancamento]="previsto" [comData]="true" />
              </pressable>
            }
          </view>
        }

        <view class="secao">
          <text class="secao-titulo" accessibilityRole="header">Lançamentos de hoje</text>
          @for (lancamento of painel().deHoje; track lancamento.id) {
            @if (lancamento.situacao === 'travado') {
              <pressable accessibilityRole="button" accessibilityHint="Ver por que foi recusado" (press)="recusado(lancamento)">
                <app-linha-lancamento [lancamento]="lancamento" />
              </pressable>
            } @else {
              <app-linha-lancamento [lancamento]="lancamento" />
            }
          } @empty {
            <text class="vazio">Nenhum lançamento hoje.</text>
          }
        </view>
      </scroll-view>

      @if (toast(); as t) {
        <view class="toast" accessibilityRole="alert">
          <ng-icon name="lucide-check" [size]="20" color="#6EE7B7" [strokeWidth]="2.4" />
          <text class="toast-texto" numberOfLines="1">{{ t.texto }}</text>
          <pressable class="toast-botao" accessibilityRole="button" (press)="desfazer()">
            <text class="toast-botao-texto">Desfazer</text>
          </pressable>
        </view>
      }

      <view class="barra">
        <view class="aba" accessibilityRole="tab" [accessibilityState]="{ selected: true }">
          <ng-icon name="lucide-thermometer" [size]="24" color="#15171C" />
          <text class="aba-texto">Hoje</text>
        </view>
        <pressable class="mais" accessibilityRole="button" accessibilityLabel="Novo lançamento" (press)="lancando.set(true)">
          <ng-icon name="lucide-plus" [size]="26" color="#FFFFFF" [strokeWidth]="2.4" />
        </pressable>
      </view>
    </safe-area-view>

    @if (lancando()) {
      <app-lancar (fechar)="lancando.set(false)" (lancado)="aoLancar($event)" />
    }
    @if (ajustando(); as previsto) {
      <app-ajustar-previsto [previsto]="previsto" (fechar)="ajustando.set(null)" (confirmado)="confirmarAjustado(previsto, $event)" />
    }
  `,
  styles: `
    .tela {
      flex: 1;
      background-color: #f7f7f5;
    }
    .rolagem {
      flex: 1;
    }
    .cabeca {
      flex-direction: row;
      align-items: flex-end;
      justify-content: space-between;
    }
    .cabeca-texto {
      gap: 2px;
    }
    .data {
      font-size: 14px;
      color: #5b6070;
      font-weight: 500;
    }
    .titulo {
      font-size: 34px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: #15171c;
    }
    .pilula {
      flex-direction: row;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 999px;
      margin-bottom: 6px;
    }
    .tom-ok {
      background-color: #e1f3ea;
    }
    .tom-enviando {
      background-color: #e8eefd;
    }
    .tom-offline {
      background-color: #ececE7;
    }
    .tom-alerta {
      background-color: #fff4e5;
    }
    .pilula-texto {
      font-size: 12px;
      font-weight: 700;
    }
    .faixa {
      flex-direction: row;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 16px;
      border-width: 1px;
      border-color: #f5d9b0;
      background-color: #fff4e5;
    }
    .faixa-texto {
      flex: 1;
      font-size: 14px;
      line-height: 20px;
      color: #5c3300;
    }
    .forte {
      font-weight: 700;
    }
    .faixa-ok {
      min-height: 44px;
      min-width: 44px;
      align-items: center;
      justify-content: center;
      margin: -12px -8px -12px 0;
    }
    .faixa-ok-texto {
      font-size: 14px;
      font-weight: 700;
      color: #9a4a00;
    }
    .pares {
      flex-direction: row;
      gap: 12px;
    }
    .caixa {
      flex: 1;
      background-color: #ffffff;
      border-width: 1px;
      border-color: #ececE7;
      border-radius: 16px;
      padding: 12px 16px;
      gap: 3px;
    }
    .caixa-rotulo {
      font-size: 13px;
      color: #5b6070;
      font-weight: 600;
    }
    .caixa-valor {
      font-size: 22px;
      font-weight: 700;
      color: #15171c;
      font-variant-numeric: tabular-nums;
    }
    .caixa-valor.baixo {
      color: #b43c0a;
    }
    .caixa-nota {
      font-size: 12px;
      color: #5b6070;
    }
    .secao {
      background-color: #ffffff;
      border-width: 1px;
      border-color: #ececE7;
      border-radius: 18px;
      padding: 12px 16px;
    }
    .secao-titulo {
      font-size: 16px;
      font-weight: 700;
      color: #15171c;
      min-height: 28px;
    }
    .secao-dica {
      font-size: 13px;
      color: #5b6070;
    }
    .vazio {
      font-size: 14px;
      color: #5b6070;
      padding: 12px 0;
    }
    .toast {
      position: absolute;
      left: 16px;
      right: 16px;
      bottom: 100px;
      flex-direction: row;
      align-items: center;
      gap: 10px;
      min-height: 52px;
      padding: 4px 4px 4px 16px;
      border-radius: 14px;
      background-color: #15171c;
    }
    .toast-texto {
      flex: 1;
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
    }
    .toast-botao {
      min-height: 44px;
      padding: 0 14px;
      justify-content: center;
    }
    .toast-botao-texto {
      font-size: 14px;
      font-weight: 700;
      color: #93b4ff;
    }
    .barra {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 88px;
      padding: 8px 48px 0;
      flex-direction: row;
      justify-content: space-between;
      align-items: flex-start;
      background-color: #ffffff;
      border-top-width: 1px;
      border-color: #e6e6e1;
    }
    .aba {
      width: 64px;
      min-height: 48px;
      align-items: center;
      gap: 3px;
    }
    .aba-texto {
      font-size: 12px;
      font-weight: 700;
      color: #15171c;
    }
    .mais {
      width: 56px;
      height: 56px;
      border-radius: 28px;
      background-color: #15171c;
      align-items: center;
      justify-content: center;
    }
  `,
})
export class Hoje {
  private readonly app = inject(EstadoDoApp);
  private readonly dialogs = inject(Dialogs);
  protected readonly estado = this.app.estado;
  protected readonly painel = this.app.painel;

  protected readonly atualizando = signal(false);
  protected readonly lancando = signal(false);
  protected readonly ajustando = signal<LancamentoNaTela | null>(null);
  protected readonly toast = signal<Lancado | null>(null);
  private esconderToast: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.esconderToast));
  }

  protected readonly dataDeHoje = computed(() => dataPorExtenso(this.estado().hoje));

  protected readonly saldo = computed(() => {
    const saldo = this.painel().saldo;
    return saldo ? this.reais(saldo.centavos) : '—';
  });

  /** Aviso da tela 3b: só sem rede e com algo guardado. */
  protected readonly guardadosSemRede = computed(() =>
    this.estado().online ? 0 : this.estado().fila.length,
  );

  protected readonly pilula = computed(() => {
    const { bloqueio, online, fila, sincronizando } = this.estado();
    const tons: Record<Tom, string> = {
      ok: '#0B5E41',
      enviando: '#1D4ED8',
      offline: '#3F4350',
      alerta: '#9A4A00',
    };
    const montar = (tom: Tom, icone: string, texto: string) => ({
      tom,
      icone,
      texto,
      cor: tons[tom],
    });
    if (bloqueio === 'token') return montar('alerta', 'lucide-triangle-alert', 'Token recusado');
    if (bloqueio === 'versao') return montar('alerta', 'lucide-triangle-alert', 'Atualize o app');
    if (!online) return montar('offline', 'lucide-wifi-off', 'Offline');
    if (sincronizando && fila.length > 0)
      return montar('enviando', 'lucide-refresh-cw', 'Enviando…');
    if (fila.length > 0) return montar('alerta', 'lucide-clock', `${fila.length} na fila`);
    return montar('ok', 'lucide-check', 'Planilha em dia');
  });

  protected reais(valor: number): string {
    return formatarReais(centavos(valor));
  }

  protected curta(data: DataISO): string {
    return dataCurta(data);
  }

  protected diaDe(data: string): number {
    return Number(data.slice(8, 10));
  }

  protected async atualizar(): Promise<void> {
    this.atualizando.set(true);
    await this.app.termometro.atualizar();
    this.atualizando.set(false);
  }

  protected dispensar(id: string): void {
    this.app.termometro.dispensarAviso(id);
  }

  protected confirmar(previsto: LancamentoNaTela): void {
    void this.app.termometro.confirmar(previsto.id);
  }

  protected confirmarAjustado(
    previsto: LancamentoNaTela,
    ajuste: { valorCentavos: number; data: DataISO },
  ): void {
    this.ajustando.set(null);
    void this.app.termometro.confirmar(previsto.id, ajuste);
  }

  protected aoLancar(lancado: Lancado): void {
    this.lancando.set(false);
    this.toast.set(lancado);
    clearTimeout(this.esconderToast);
    this.esconderToast = setTimeout(() => this.toast.set(null), TEMPO_DO_DESFAZER_MS);
  }

  protected desfazer(): void {
    const lancado = this.toast();
    this.toast.set(null);
    clearTimeout(this.esconderToast);
    if (lancado) void this.app.termometro.desfazer(lancado.id);
  }

  protected async recusado(lancamento: LancamentoNaTela): Promise<void> {
    const operacao = this.estado().fila.find((o) => alvos(o).includes(lancamento.id));
    if (!operacao) return;
    const escolha = await this.dialogs.choose(
      `A planilha recusou este lançamento: ${operacao.ultimoErro ?? 'motivo desconhecido'}`,
      [{ label: 'Descartar', style: 'destructive' }],
    );
    if (escolha === 0) await this.app.termometro.descartar(operacao.opId);
  }
}
