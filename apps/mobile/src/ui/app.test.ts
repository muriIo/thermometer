import { render, screen } from '@ng-native/testing';
import { expect, test } from 'vitest';
import { App } from './app.ts';

test('mostra o nome do app e um valor formatado pelo domínio', async () => {
  await render(App);

  expect(screen.getByText('Termômetro')).toBeTruthy();
  expect(screen.getByText('R$ 0,00')).toBeTruthy();
});
