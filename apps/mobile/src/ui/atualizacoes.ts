import { effect, inject, Service, signal } from '@angular/core';
import { AppState } from '@ng-native/device';
import { Updates } from '@ng-native/expo/updates';

/**
 * Updates OTA (EAS Update, PROJECT.md, 13). O `expo-updates` sozinho só
 * aplica um update na próxima abertura a frio, o que no Android pode levar
 * dias. Aqui, ao voltar ao primeiro plano: se há update pronto e nada está
 * sendo digitado, reinicia nele; senão procura e baixa, para a próxima vez.
 * Reiniciar não perde nada: a fila está no SQLite e reenviar é seguro (ADR 0010).
 */
@Service()
export class Atualizacoes {
  /** Lançar ou ajuste de previsto aberto: reiniciar agora perderia o que foi digitado. */
  readonly ocupado = signal(false);

  constructor() {
    const updates = inject(Updates);
    const appState = inject(AppState);
    let estavaAtivo = false;
    effect(() => {
      const ativo = appState.active();
      if (ativo && !estavaAtivo) {
        if (updates.ready() && !this.ocupado()) void updates.apply();
        else void updates.check();
      }
      estavaAtivo = ativo;
    });
  }
}
