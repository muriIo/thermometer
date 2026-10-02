/** O que o `expo-updates` diz sobre o JS em execução. */
export type EstadoDoUpdate = {
  readonly isEnabled: boolean;
  readonly isEmbeddedLaunch: boolean;
  readonly updateId: string | null;
};

/**
 * "v0.1.0 · OTA 3f2a9c1d": a versão do app e qual JS está rodando, para saber
 * se um update chegou ao celular. `embutido` é o JS que veio no APK; `dev`,
 * o do Metro (Expo Go ou desenvolvimento), onde não há update.
 */
export function textoDaVersao(versao: string, update: EstadoDoUpdate): string {
  if (!update.isEnabled) return `v${versao} · dev`;
  if (update.isEmbeddedLaunch || !update.updateId) return `v${versao} · embutido`;
  return `v${versao} · OTA ${update.updateId.slice(0, 8)}`;
}
