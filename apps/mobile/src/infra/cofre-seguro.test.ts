import { expect, it } from 'vitest';
import { CofreSeguro } from './cofre-seguro.ts';

it('guarda e lê o token pela mesma chave', async () => {
  const itens = new Map<string, string>();
  const cofre = new CofreSeguro({
    getItemAsync: async (chave) => itens.get(chave) ?? null,
    setItemAsync: async (chave, valor) => {
      itens.set(chave, valor);
    },
  });

  expect(await cofre.lerToken()).toBeNull();
  await cofre.guardarToken('tk');
  expect(await cofre.lerToken()).toBe('tk');
});
