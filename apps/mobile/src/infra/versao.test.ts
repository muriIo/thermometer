import { describe, expect, it } from 'vitest';
import { textoDaVersao } from './versao.ts';

describe('textoDaVersao', () => {
  it.each([
    [{ isEnabled: false, isEmbeddedLaunch: true, updateId: null }, 'v0.1.0 · dev'],
    [{ isEnabled: true, isEmbeddedLaunch: true, updateId: 'abc' }, 'v0.1.0 · embutido'],
    [
      {
        isEnabled: true,
        isEmbeddedLaunch: false,
        updateId: '3f2a9c1d-1111-4222-8333-444455556666',
      },
      'v0.1.0 · OTA 3f2a9c1d',
    ],
  ])('%o → %s', (update, texto) => {
    expect(textoDaVersao('0.1.0', update)).toBe(texto);
  });
});
