/**
 * As portas da aplicação montadas com os módulos do aparelho. Só `main.ts`
 * importa este arquivo: ele carrega módulos nativos que não existem em Node.
 */
import { database } from '@ng-native/expo/database';
import * as SecureStore from 'expo-secure-store';
import type { Portas } from '../aplicacao/portas.ts';
import { ApiAppsScript } from './api-apps-script.ts';
import { ArmazemSqlite, MIGRACOES } from './armazem-sqlite.ts';
import { CofreSeguro } from './cofre-seguro.ts';
import { agendadorComTimers, relogioDoAparelho } from './relogio.ts';

const banco = database('termometro.db', MIGRACOES);

export function portasDoAparelho(config: {
  /** URL /exec do Web App; vem de EXPO_PUBLIC_API_URL, por perfil do EAS (PROJECT.md, 11). */
  readonly url: string;
  readonly novoId: () => string;
}): Portas {
  return {
    api: new ApiAppsScript(config.url, fetch),
    armazem: new ArmazemSqlite(() => banco.ready()),
    cofre: new CofreSeguro(SecureStore),
    relogio: relogioDoAparelho(),
    agendador: agendadorComTimers,
    novoId: config.novoId,
  };
}
