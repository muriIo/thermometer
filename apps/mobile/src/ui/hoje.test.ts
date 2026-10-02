import { screen, userEvent, waitFor } from '@ng-native/testing';
import { describe, expect, it } from 'vitest';
import { renderizarApp } from './app.fixture.ts';

describe('Hoje', () => {
  it('mostra o termômetro, o saldo lido e a planilha em dia', async () => {
    await renderizarApp();

    expect(await screen.findByText('Planilha em dia')).toBeTruthy();
    expect(screen.getByText('Quinta, 5 de novembro')).toBeTruthy();
    expect(await screen.findByText('previsto R$ 50,00')).toBeTruthy();
    expect(screen.getByText('R$ 1.000,00')).toBeTruthy();
    expect(screen.queryByText('estimado')).toBeNull();
    expect(screen.getByText('Nenhum lançamento hoje.')).toBeTruthy();
  });

  it('sem internet: avisa o que ficou guardado e estima o saldo (tela 3b)', async () => {
    const { termometro } = await renderizarApp({ online: false });
    await termometro.lancar({
      data: termometro.estado.hoje,
      valorCentavos: 800,
      tipo: 'diario',
      quem: 'Thays',
      meio: 'avista',
      descricao: 'Salgado',
    });

    expect(await screen.findByText('Offline')).toBeTruthy();
    expect(screen.getByText(/1 lançamento guardado/)).toBeTruthy();
    expect(screen.getByText('pendente')).toBeTruthy();
    expect(screen.getByText('Salgado')).toBeTruthy();
  });

  it('a confirmar: um toque confirma o previsto na planilha', async () => {
    const { api, termometro } = await renderizarApp();
    const resultado = await termometro.lancar({
      data: termometro.estado.hoje,
      valorCentavos: 150_000,
      tipo: 'saida',
      quem: 'Thays',
      meio: 'avista',
      descricao: 'Aluguel',
    });
    await termometro.ocioso();
    const id = resultado.ok ? (resultado.ids[0] as string) : '';
    api.editarAMao(id, { status: 'previsto' });
    await termometro.atualizar();

    await userEvent
      .setup()
      .press(await screen.findByRole('button', { name: 'Confirmar Aluguel de 5/nov' }));

    await waitFor(() => expect(api.linhas.get(id)?.status).toBe('confirmado'));
    await waitFor(() => expect(screen.queryByText('A confirmar')).toBeNull());
  });

  it('aviso do núcleo aparece e some ao dispensar', async () => {
    const { api, termometro } = await renderizarApp();
    api.errosForcados.set('lancar', 'INVALID_PAYLOAD');
    await termometro.lancar({
      data: termometro.estado.hoje,
      valorCentavos: 800,
      tipo: 'diario',
      quem: 'Thays',
      meio: 'avista',
    });

    const aviso = await screen.findByText(/recusado pela planilha/);
    expect(aviso).toBeTruthy();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Dispensar aviso' }));
    await waitFor(() => expect(screen.queryByText(/recusado pela planilha/)).toBeNull());
  });
});
