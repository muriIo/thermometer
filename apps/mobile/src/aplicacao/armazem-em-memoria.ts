import { aplicarMudanca, type Guardado, type Mudanca, NADA_GUARDADO } from './guardado.ts';
import type { Armazem } from './portas.ts';

/** `Armazem` sem persistência: testes e plataformas sem SQLite. */
export class ArmazemEmMemoria implements Armazem {
  constructor(private guardado: Guardado = NADA_GUARDADO) {}

  carregar(): Promise<Guardado> {
    return Promise.resolve(this.guardado);
  }

  aplicar(mudanca: Mudanca): Promise<void> {
    this.guardado = aplicarMudanca(this.guardado, mudanca);
    return Promise.resolve();
  }
}
