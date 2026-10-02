// Variáveis EXPO_PUBLIC_* que o Metro escreve no bundle. Nada secreto aqui: o
// token nunca entra no build (PROJECT.md, 8.5).
declare const process: {
  readonly env: {
    readonly EXPO_PUBLIC_API_URL?: string;
  };
};
