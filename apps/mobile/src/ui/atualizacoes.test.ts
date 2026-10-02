import { signal } from '@angular/core';
import { AppState } from '@ng-native/device';
import { Updates } from '@ng-native/expo/updates';
import { injectService } from '@ng-native/testing';
import { describe, expect, it, vi } from 'vitest';
import { Atualizacoes } from './atualizacoes.ts';

function montar() {
  const ativo = signal(true);
  const updates = {
    ready: signal(false),
    check: vi.fn(async () => false),
    apply: vi.fn(async () => {}),
  };
  const atualizacoes = injectService(Atualizacoes, {
    providers: [
      { provide: Updates, useValue: updates },
      { provide: AppState, useValue: { active: ativo } },
    ],
  });
  const voltar = async () => {
    ativo.set(false);
    await new Promise((r) => setTimeout(r, 0));
    ativo.set(true);
    await new Promise((r) => setTimeout(r, 0));
  };
  return { updates, atualizacoes, voltar };
}

describe('Atualizacoes', () => {
  it('ao abrir, procura e baixa um update', async () => {
    const { updates } = montar();
    await vi.waitFor(() => expect(updates.check).toHaveBeenCalledTimes(1));
    expect(updates.apply).not.toHaveBeenCalled();
  });

  it('update pronto: reinicia nele ao voltar ao primeiro plano', async () => {
    const { updates, voltar } = montar();
    updates.ready.set(true);

    await voltar();

    expect(updates.apply).toHaveBeenCalledTimes(1);
  });

  it('com o Lançar aberto, não reinicia: espera a próxima volta', async () => {
    const { updates, atualizacoes, voltar } = montar();
    updates.ready.set(true);
    atualizacoes.ocupado.set(true);

    await voltar();
    expect(updates.apply).not.toHaveBeenCalled();

    atualizacoes.ocupado.set(false);
    await voltar();
    expect(updates.apply).toHaveBeenCalledTimes(1);
  });
});
