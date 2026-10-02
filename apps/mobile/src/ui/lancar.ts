import { Component, computed, inject, output, signal } from '@angular/core';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from '@ng-native/components';
import { Dialogs } from '@ng-native/device';
import { NgIcon } from '@ng-native/icons';
import {
  CATEGORIAS_GASTO,
  CATEGORIAS_RECEITA,
  type Categoria,
  centavos,
  type Estorna,
  formatarReais,
  type Lancamento,
  previstoParecido,
  QUEM,
  type Quem,
  somarDias,
  type Tipo,
} from '@termometro/dominio';
import { projetar } from '../aplicacao/projecao.ts';
import type { Rascunho } from '../aplicacao/rascunho.ts';
import { TIPOS_VISUAIS } from './aparencia.ts';
import { EstadoDoApp } from './estado-do-app.ts';
import { centavosDoTeclado, dataCurta, teclar } from './formatos.ts';

/** O que a Hoje precisa para o toast "Desfazer" (tela 3). */
export type Lancado = { readonly id: string; readonly texto: string };

const TIPOS: readonly Tipo[] = ['diario', 'saida', 'entrada', 'estorno'];
const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '<'];
const MAXIMO_RECENTES = 6;

/** Descrições já usadas neste tipo, da mais recente para a mais antiga, sem repetir. */
function descricoesRecentes(lancamentos: readonly Lancamento[], tipo: Tipo): string[] {
  const recentes = lancamentos
    .filter((l) => l.tipo === tipo && l.descricao.trim() !== '')
    .sort((a, b) => b.data.localeCompare(a.data))
    .map((l) => l.descricao.trim());
  return [...new Set(recentes)].slice(0, MAXIMO_RECENTES);
}

/**
 * Tela 2, Lançar (PROJECT.md, 10). Valida no núcleo antes de entrar na fila;
 * se parecer um previsto de ±3 dias, oferece confirmar em vez de criar.
 */
@Component({
  selector: 'app-lancar',
  imports: [Modal, NgIcon, Pressable, SafeAreaView, ScrollView, Text, TextInput, View],
  template: `
    <modal animationType="slide" presentationStyle="pageSheet" (requestClose)="fechar.emit()">
      <safe-area-view class="tela">
        <view class="topo">
          <pressable class="redondo" accessibilityRole="button" accessibilityLabel="Fechar" (press)="fechar.emit()">
            <ng-icon name="lucide-x" [size]="20" color="#15171C" />
          </pressable>
          <text class="titulo" accessibilityRole="header">Novo lançamento</text>
          <view class="redondo-vazio"></view>
        </view>

        <view class="tipos" accessibilityRole="radiogroup">
          @for (t of tipos; track t) {
            <pressable
              class="tipo"
              accessibilityRole="radio"
              [accessibilityState]="{ selected: tipo() === t }"
              [style.backgroundColor]="tipo() === t ? visual(t).cor : '#F1F1EE'"
              (press)="escolherTipo(t)"
            >
              <text class="tipo-texto" [style.color]="tipo() === t ? '#FFFFFF' : '#15171C'">{{ visual(t).nome }}</text>
            </pressable>
          }
        </view>

        <view class="valor-bloco">
          <text class="valor" accessibilityLabel="Valor">{{ reais() }}</text>
          <text class="destino">{{ destino() }}</text>
        </view>

        <scroll-view class="opcoes" keyboardShouldPersistTaps="handled" [contentContainerStyle]="{ gap: 10 }">
          @if (sugestao(); as previsto) {
            <view class="sugestao">
              <text class="sugestao-texto">
                É {{ previsto.descricao || previsto.categoria }} previsto para {{ curta(previsto.data) }}?
              </text>
              <pressable class="sugestao-botao" accessibilityRole="button" (press)="confirmarPrevisto()">
                <text class="sugestao-botao-texto">Confirmar em vez de criar</text>
              </pressable>
            </view>
          }

          @if (tipo() === 'estorno') {
            <view class="fileira">
              @for (alvo of estornos; track alvo.valor) {
                <pressable
                  class="ficha"
                  accessibilityRole="radio"
                  [accessibilityState]="{ selected: estorna() === alvo.valor }"
                  [class.marcada]="estorna() === alvo.valor"
                  (press)="estorna.set(alvo.valor)"
                >
                  <text class="ficha-texto" [class.marcada-texto]="estorna() === alvo.valor">{{ alvo.texto }}</text>
                </pressable>
              }
            </view>
          }

          <scroll-view [horizontal]="true" [showsHorizontalScrollIndicator]="false" [contentContainerStyle]="{ gap: 6 }">
            @for (c of categorias(); track c.nome) {
              <pressable
                class="categoria"
                accessibilityRole="radio"
                [accessibilityLabel]="c.nome"
                [accessibilityState]="{ selected: categoria() === c.nome }"
                (press)="alternarCategoria(c.nome)"
              >
                <view
                  class="categoria-icone"
                  [style.backgroundColor]="categoria() === c.nome ? (c.cor ?? '#15171C') : (c.fundo ?? '#EEEFF2')"
                >
                  <ng-icon
                    [name]="'lucide-' + c.icone"
                    [size]="24"
                    [color]="categoria() === c.nome ? '#FFFFFF' : (c.cor ?? '#15171C')"
                  />
                </view>
                <text class="categoria-nome" numberOfLines="1">{{ c.nome }}</text>
              </pressable>
            }
          </scroll-view>

          <text-input
            class="descricao"
            accessibilityLabel="Descrição"
            placeholder="Descrição"
            placeholderTextColor="#8A8F9C"
            [maxLength]="80"
            [(value)]="descricao"
          />
          @if (recentes().length > 0) {
            <scroll-view [horizontal]="true" [showsHorizontalScrollIndicator]="false" [contentContainerStyle]="{ gap: 8 }">
              @for (r of recentes(); track r) {
                <pressable
                  class="ficha"
                  accessibilityRole="button"
                  [class.marcada]="descricao() === r"
                  (press)="descricao.set(r)"
                >
                  <text class="ficha-texto" [class.marcada-texto]="descricao() === r">{{ r }}</text>
                </pressable>
              }
            </scroll-view>
          }

          @if (tipo() !== 'entrada') {
            <scroll-view [horizontal]="true" [showsHorizontalScrollIndicator]="false" [contentContainerStyle]="{ gap: 8 }">
              <pressable
                class="ficha"
                accessibilityRole="radio"
                [accessibilityState]="{ selected: cartao() === null }"
                [class.marcada]="cartao() === null"
                (press)="cartao.set(null)"
              >
                <text class="ficha-texto" [class.marcada-texto]="cartao() === null">À vista</text>
              </pressable>
              @for (c of cartoes(); track c.id) {
                <pressable
                  class="ficha"
                  accessibilityRole="radio"
                  [accessibilityState]="{ selected: cartao() === c.id }"
                  [class.marcada]="cartao() === c.id"
                  (press)="cartao.set(c.id)"
                >
                  <text class="ficha-texto" [class.marcada-texto]="cartao() === c.id">{{ c.nome }}</text>
                </pressable>
              }
            </scroll-view>
          }

          @if (parcelavel()) {
            <view class="fileira">
              <text class="rotulo">Parcelas</text>
              <pressable class="redondo" accessibilityRole="button" accessibilityLabel="Menos parcelas" (press)="mudarParcelas(-1)">
                <ng-icon name="lucide-minus" [size]="18" color="#15171C" />
              </pressable>
              <text class="parcelas">{{ parcelas() === 1 ? 'à vista' : parcelas() + 'x' }}</text>
              <pressable class="redondo" accessibilityRole="button" accessibilityLabel="Mais parcelas" (press)="mudarParcelas(1)">
                <ng-icon name="lucide-plus" [size]="18" color="#15171C" />
              </pressable>
            </view>
          }

          <view class="fileira">
            <pressable class="redondo" accessibilityRole="button" accessibilityLabel="Dia anterior" (press)="mudarDia(-1)">
              <ng-icon name="lucide-chevron-left" [size]="18" color="#15171C" />
            </pressable>
            <view class="data">
              <ng-icon name="lucide-calendar" [size]="18" color="#15171C" />
              <text class="ficha-texto">{{ dataTexto() }}</text>
            </view>
            <pressable class="redondo" accessibilityRole="button" accessibilityLabel="Dia seguinte" (press)="mudarDia(1)">
              <ng-icon name="lucide-chevron-right" [size]="18" color="#15171C" />
            </pressable>
          </view>

          <view class="fileira" accessibilityRole="radiogroup">
            @for (q of pessoas; track q) {
              <pressable
                class="ficha"
                accessibilityRole="radio"
                [accessibilityState]="{ selected: quem() === q }"
                [class.marcada]="quem() === q"
                (press)="quem.set(q)"
              >
                <text class="ficha-texto" [class.marcada-texto]="quem() === q">{{ q }}</text>
              </pressable>
            }
          </view>

          @if (problema(); as texto) {
            <text class="problema" accessibilityRole="alert">{{ texto }}</text>
          }
        </scroll-view>

        <view class="teclado">
          @for (tecla of teclas; track tecla) {
            <pressable
              class="tecla"
              accessibilityRole="button"
              [accessibilityLabel]="tecla === '<' ? 'Apagar' : tecla"
              (press)="digitar(tecla)"
            >
              @if (tecla === '<') {
                <ng-icon name="lucide-delete" [size]="24" color="#15171C" />
              } @else {
                <text class="tecla-texto">{{ tecla }}</text>
              }
            </pressable>
          }
        </view>

        <pressable
          class="botao"
          accessibilityRole="button"
          [accessibilityState]="{ disabled: valorCentavos() <= 0 }"
          [disabled]="valorCentavos() <= 0"
          [class.inativo]="valorCentavos() <= 0"
          (press)="lancar()"
        >
          <text class="botao-texto">Lançar {{ reais() }}</text>
        </pressable>
      </safe-area-view>
    </modal>
  `,
  styles: `
    .tela {
      flex: 1;
      background-color: #ffffff;
      padding: 12px 20px 16px;
      gap: 10px;
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
    .tipos {
      flex-direction: row;
      gap: 8px;
    }
    .tipo {
      flex: 1;
      min-height: 44px;
      border-radius: 12px;
      align-items: center;
      justify-content: center;
    }
    .tipo-texto {
      font-size: 14px;
      font-weight: 700;
    }
    .valor-bloco {
      align-items: center;
      gap: 2px;
    }
    .valor {
      font-size: 54px;
      font-weight: 700;
      letter-spacing: -1px;
      color: #15171c;
      font-variant-numeric: tabular-nums;
    }
    .destino {
      font-size: 13px;
      color: #5b6070;
    }
    .opcoes {
      flex: 1;
    }
    .sugestao {
      padding: 12px 14px;
      border-radius: 14px;
      background-color: #fff4e5;
      border-width: 1px;
      border-color: #f5d9b0;
      gap: 8px;
    }
    .sugestao-texto {
      font-size: 15px;
      font-weight: 600;
      color: #5c3300;
    }
    .sugestao-botao {
      min-height: 44px;
      border-radius: 12px;
      background-color: #15171c;
      align-items: center;
      justify-content: center;
    }
    .sugestao-botao-texto {
      color: #ffffff;
      font-size: 15px;
      font-weight: 700;
    }
    .categoria {
      width: 72px;
      min-height: 64px;
      align-items: center;
      gap: 4px;
    }
    .categoria-icone {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      align-items: center;
      justify-content: center;
    }
    .categoria-nome {
      font-size: 11px;
      font-weight: 600;
      color: #15171c;
    }
    .descricao {
      height: 48px;
      border-radius: 12px;
      border-width: 1.5px;
      border-color: #15171c;
      padding: 0 14px;
      font-size: 16px;
      color: #15171c;
    }
    .fileira {
      flex-direction: row;
      align-items: center;
      gap: 8px;
    }
    .ficha {
      min-height: 44px;
      padding: 0 14px;
      border-radius: 22px;
      border-width: 1px;
      border-color: #e6e6e1;
      background-color: #ffffff;
      justify-content: center;
    }
    .ficha.marcada {
      background-color: #15171c;
      border-color: #15171c;
    }
    .ficha-texto {
      font-size: 14px;
      font-weight: 600;
      color: #15171c;
    }
    .marcada-texto {
      color: #ffffff;
    }
    .rotulo {
      font-size: 14px;
      font-weight: 600;
      color: #5b6070;
      flex: 1;
    }
    .parcelas {
      min-width: 64px;
      text-align: center;
      font-size: 15px;
      font-weight: 700;
      color: #15171c;
    }
    .data {
      flex: 1;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .problema {
      font-size: 14px;
      font-weight: 600;
      color: #b43c0a;
    }
    .teclado {
      flex-direction: row;
      flex-wrap: wrap;
    }
    .tecla {
      width: 33.33%;
      min-height: 48px;
      align-items: center;
      justify-content: center;
    }
    .tecla-texto {
      font-size: 24px;
      font-weight: 600;
      color: #15171c;
    }
    .botao {
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
export class Lancar {
  private readonly app = inject(EstadoDoApp);
  private readonly dialogs = inject(Dialogs);
  readonly lancado = output<Lancado>();
  readonly fechar = output();

  protected readonly tipos = TIPOS;
  protected readonly teclas = TECLAS;
  protected readonly pessoas = QUEM;
  protected readonly estornos: readonly { valor: Estorna; texto: string }[] = [
    { valor: 'diario', texto: 'Estorna do Diário' },
    { valor: 'saida', texto: 'Estorna da Saída' },
  ];

  protected readonly tipo = signal<Tipo>('diario');
  protected readonly estorna = signal<Estorna>('diario');
  private readonly teclado = signal('');
  protected readonly categoria = signal<string | null>(null);
  protected readonly descricao = signal('');
  protected readonly cartao = signal<string | null>(null);
  protected readonly parcelas = signal(1);
  private readonly deslocamento = signal(0);
  protected readonly quem = signal<Quem>(this.quemPadrao());
  protected readonly problema = signal<string | null>(null);

  protected readonly valorCentavos = computed(() => centavosDoTeclado(this.teclado()));
  protected readonly reais = computed(() => formatarReais(centavos(this.valorCentavos())));
  private readonly data = computed(() => somarDias(this.app.estado().hoje, this.deslocamento()));
  protected readonly dataTexto = computed(() => {
    const prefixo = this.deslocamento() === 0 ? 'Hoje, ' : '';
    return prefixo + dataCurta(this.data());
  });

  private readonly naTela = computed(() => {
    const { espelho, fila, emEnvio } = this.app.estado();
    return projetar(espelho, fila, emEnvio);
  });

  protected readonly categorias = computed((): readonly Categoria[] => {
    const referencias = this.app.estado().referencias?.categorias;
    if (this.tipo() === 'entrada') return referencias?.receita ?? CATEGORIAS_RECEITA;
    return referencias?.gasto ?? CATEGORIAS_GASTO;
  });

  protected readonly cartoes = computed(() => this.app.estado().referencias?.cartoes ?? []);
  protected readonly recentes = computed(() => descricoesRecentes(this.naTela(), this.tipo()));
  protected readonly parcelavel = computed(
    () => this.tipo() === 'diario' || this.tipo() === 'saida',
  );

  protected readonly destino = computed(() => {
    const tipo = this.tipo();
    if (tipo === 'estorno') {
      return `desconta ${this.estorna() === 'diario' ? 'do Diário' : 'da Saída'}`;
    }
    const cartao = this.cartoes().find((c) => c.id === this.cartao());
    if (cartao) return `no cartão ${cartao.nome}: entra na fatura`;
    return `vai para a coluna ${TIPOS_VISUAIS[tipo].nome} de ${dataCurta(this.data())}`;
  });

  protected readonly sugestao = computed(() => {
    if (this.valorCentavos() <= 0 && this.descricao().trim() === '') return null;
    return previstoParecido(this.naTela(), {
      tipo: this.tipo(),
      descricao: this.descricao(),
      valorCentavos: centavos(this.valorCentavos()),
      data: this.data(),
    });
  });

  protected visual(tipo: Tipo) {
    return TIPOS_VISUAIS[tipo];
  }

  protected curta(data: Lancamento['data']): string {
    return dataCurta(data);
  }

  protected escolherTipo(tipo: Tipo): void {
    this.tipo.set(tipo);
    this.categoria.set(null);
    if (tipo === 'entrada') this.cartao.set(null);
    if (tipo !== 'diario' && tipo !== 'saida') this.parcelas.set(1);
  }

  protected alternarCategoria(nome: string): void {
    this.categoria.set(this.categoria() === nome ? null : nome);
  }

  protected digitar(tecla: string): void {
    this.teclado.set(teclar(this.teclado(), tecla));
  }

  protected mudarParcelas(diferenca: number): void {
    this.parcelas.set(Math.min(Math.max(this.parcelas() + diferenca, 1), 120));
  }

  protected mudarDia(dias: number): void {
    this.deslocamento.update((atual) => atual + dias);
  }

  protected async confirmarPrevisto(): Promise<void> {
    const previsto = this.sugestao();
    if (!previsto) return;
    const valor = this.valorCentavos();
    const resultado = await this.app.termometro.confirmar(previsto.id, {
      ...(valor > 0 ? { valorCentavos: valor } : {}),
      data: this.data(),
    });
    if (resultado.ok) this.fechar.emit();
    else this.problema.set(resultado.problema);
  }

  protected async lancar(): Promise<void> {
    if (this.valorCentavos() <= 0) return;
    if (!(await this.confirmarSeAlto())) return;
    const rascunho = this.rascunho();
    const resultado = await this.app.termometro.lancar(rascunho);
    if (!resultado.ok) {
      this.problema.set(resultado.problema);
      return;
    }
    const nome = rascunho.descricao || rascunho.categoria || TIPOS_VISUAIS[rascunho.tipo].nome;
    this.lancado.emit({ id: resultado.ids[0] ?? '', texto: `${nome} · ${this.reais()} lançado` });
  }

  /** "Confirmação acima do limite" (tela 2): Diário acima de `confirmarAcimaDiarioCentavos`. */
  private async confirmarSeAlto(): Promise<boolean> {
    const limite = this.app.estado().referencias?.limites.confirmarAcimaDiarioCentavos;
    if (this.tipo() !== 'diario' || limite === undefined || this.valorCentavos() <= limite) {
      return true;
    }
    return this.dialogs.confirm(`Lançar ${this.reais()} no Diário?`);
  }

  private rascunho(): Rascunho {
    const cartao = this.tipo() === 'entrada' ? null : this.cartao();
    const descricao = this.descricao().trim();
    const categoria = this.categoria();
    return {
      data: this.data(),
      valorCentavos: this.valorCentavos(),
      tipo: this.tipo(),
      quem: this.quem(),
      meio: cartao ? 'cartao' : 'avista',
      ...(cartao ? { cartao } : {}),
      ...(this.tipo() === 'estorno' ? { estorna: this.estorna() } : {}),
      ...(categoria ? { categoria } : {}),
      ...(descricao ? { descricao } : {}),
      ...(this.parcelas() > 1 ? { parcelas: this.parcelas() } : {}),
    };
  }

  /** "Quem" começa no dono do token (PROJECT.md, 10, tela 2). */
  private quemPadrao(): Quem {
    const dono = this.app.estado().dono;
    return QUEM.find((q) => q === dono) ?? 'Nós dois';
  }
}
