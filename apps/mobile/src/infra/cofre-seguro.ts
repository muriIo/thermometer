import type { Cofre } from '../aplicacao/portas.ts';

/** O pedaço do expo-secure-store que o cofre usa. */
export interface Chaveiro {
  getItemAsync(chave: string): Promise<string | null>;
  setItemAsync(chave: string, valor: string): Promise<void>;
}

const CHAVE = 'termometro.token';

/**
 * Token no keystore do Android / keychain do iOS (PROJECT.md, 8.5). Usa o
 * expo-secure-store direto: o `SecureStorage` do Angular Native só lê por
 * signal, e a porta precisa de uma leitura que se possa aguardar
 * (docs/ng-native-feedback.md, 2026-10-02).
 */
export class CofreSeguro implements Cofre {
  constructor(private readonly chaveiro: Chaveiro) {}

  lerToken(): Promise<string | null> {
    return this.chaveiro.getItemAsync(CHAVE);
  }

  guardarToken(token: string): Promise<void> {
    return this.chaveiro.setItemAsync(CHAVE, token);
  }
}
