import { InjectionToken } from '@angular/core';

/** Versão do app e do JS em execução, montada em `main.ts`. Vazia nos testes. */
export const VERSAO = new InjectionToken<string>('Versao', { factory: () => '' });
