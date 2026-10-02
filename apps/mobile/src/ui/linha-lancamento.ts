import { Component, computed, input } from '@angular/core';
import { Text, View } from '@ng-native/components';
import { NgIcon } from '@ng-native/icons';
import { centavos, formatarReais } from '@termometro/dominio';
import type { LancamentoNaTela } from '../aplicacao/projecao.ts';
import { SITUACOES_VISUAIS, TIPOS_VISUAIS } from './aparencia.ts';
import { dataCurta } from './formatos.ts';

/** Uma linha de lançamento: tipo, descrição, quem, situação na fila e valor. */
@Component({
  selector: 'app-linha-lancamento',
  imports: [NgIcon, Text, View],
  template: `
    <view class="linha">
      <view class="selo" [style.backgroundColor]="tipo().fundo">
        <text class="letra" [style.color]="tipo().cor">{{ tipo().letra }}</text>
      </view>
      <view class="meio">
        <text class="titulo" numberOfLines="1">{{ titulo() }}</text>
        <view class="detalhe">
          @if (situacao(); as s) {
            <ng-icon [name]="s.icone" [size]="13" [color]="s.cor" [strokeWidth]="2.4" />
            <text class="situacao" [style.color]="s.cor">{{ s.texto }}</text>
            <text class="sub">·</text>
          }
          <text class="sub" numberOfLines="1">{{ detalhe() }}</text>
        </view>
      </view>
      <text class="valor">{{ valor() }}</text>
    </view>
  `,
  styles: `
    .linha {
      flex-direction: row;
      align-items: center;
      gap: 12px;
      min-height: 54px;
      padding: 10px 0;
    }
    .selo {
      width: 34px;
      height: 34px;
      border-radius: 17px;
      align-items: center;
      justify-content: center;
    }
    .letra {
      font-size: 14px;
      font-weight: 700;
    }
    .meio {
      flex: 1;
      gap: 2px;
    }
    .titulo {
      font-size: 15px;
      font-weight: 600;
      color: #15171c;
    }
    .detalhe {
      flex-direction: row;
      align-items: center;
      gap: 4px;
    }
    .situacao {
      font-size: 13px;
      font-weight: 600;
    }
    .sub {
      font-size: 13px;
      color: #5b6070;
    }
    .valor {
      font-size: 15px;
      font-weight: 600;
      color: #15171c;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class LinhaLancamento {
  readonly lancamento = input.required<LancamentoNaTela>();
  /** Mostra a data no detalhe, para previstos de outros dias. */
  readonly comData = input(false);

  protected readonly tipo = computed(() => TIPOS_VISUAIS[this.lancamento().tipo]);
  protected readonly situacao = computed(() => SITUACOES_VISUAIS[this.lancamento().situacao]);
  protected readonly titulo = computed(() => {
    const l = this.lancamento();
    return l.descricao || l.categoria || this.tipo().nome;
  });
  protected readonly detalhe = computed(() => {
    const l = this.lancamento();
    const partes = [this.tipo().nome, l.quem];
    if (l.parcelas) partes.push(`${l.parcelaN}/${l.parcelas}`);
    if (this.comData()) partes.push(dataCurta(l.data));
    return partes.join(' · ');
  });
  protected readonly valor = computed(() =>
    formatarReais(centavos(this.lancamento().valorCentavos)),
  );
}
