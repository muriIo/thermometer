import { describe, expect, it } from 'vitest';
import { relogioDoAparelho } from './relogio.ts';

describe('relogioDoAparelho', () => {
  it('hoje é a data local, mesmo quando em UTC já é amanhã', () => {
    const quaseMeiaNoite = new Date(2026, 10, 5, 23, 30);
    expect(relogioDoAparelho(() => quaseMeiaNoite).hoje()).toBe('2026-11-05');
  });
});
