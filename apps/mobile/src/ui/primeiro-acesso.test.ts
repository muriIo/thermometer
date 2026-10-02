import { screen, userEvent } from '@ng-native/testing';
import { describe, expect, it } from 'vitest';
import { TOKEN_BOM } from '../aplicacao/api-falsa.fixture.ts';
import { renderizarApp } from './app.fixture.ts';

describe('primeiro acesso', () => {
  it('token recusado mostra o motivo e continua na tela', async () => {
    await renderizarApp({ token: null });
    const usuario = userEvent.setup();

    await usuario.type(await screen.findByLabelText('Token de acesso'), 'errado');
    await usuario.press(screen.getByRole('button', { name: 'Conectar' }));

    expect(await screen.findByText('Token não reconhecido pela planilha.')).toBeTruthy();
  });

  it('token aceito leva para a Hoje, já com a planilha lida', async () => {
    await renderizarApp({ token: null });
    const usuario = userEvent.setup();

    await usuario.type(await screen.findByLabelText('Token de acesso'), TOKEN_BOM);
    await usuario.press(screen.getByRole('button', { name: 'Conectar' }));

    expect(await screen.findByText('Planilha em dia')).toBeTruthy();
    expect(screen.getByText('R$ 1.000,00')).toBeTruthy();
  });
});
