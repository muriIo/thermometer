import { screen, userEvent, waitFor } from '@ng-native/testing';
import { describe, expect, it } from 'vitest';
import { renderizarApp } from './app.fixture.ts';

async function abrirLancar() {
  const usuario = userEvent.setup();
  await usuario.press(await screen.findByRole('button', { name: 'Novo lançamento' }));
  return usuario;
}

async function digitar(usuario: ReturnType<typeof userEvent.setup>, teclas: string) {
  for (const tecla of teclas) {
    await usuario.press(screen.getByRole('button', { name: tecla === '<' ? 'Apagar' : tecla }));
  }
}

describe('Lançar', () => {
  it('caso comum em 3 toques: +, valor, Lançar; volta à Hoje com Desfazer', async () => {
    const { api, termometro } = await renderizarApp();
    const usuario = await abrirLancar();

    await digitar(usuario, '8');
    await usuario.press(screen.getByRole('button', { name: 'Lançar R$ 8,00' }));

    expect(await screen.findByText('Diário · R$ 8,00 lançado')).toBeTruthy();
    await termometro.ocioso();
    expect(api.ativas().map((l) => [l.tipo, l.valorCentavos, l.quem])).toEqual([
      ['diario', 800, 'Thays'],
    ]);
  });

  it('Desfazer tira o lançamento da planilha', async () => {
    const { api, termometro } = await renderizarApp();
    const usuario = await abrirLancar();
    await digitar(usuario, '12,5');
    await usuario.press(screen.getByRole('button', { name: 'Lançar R$ 12,50' }));

    await usuario.press(await screen.findByRole('button', { name: 'Desfazer' }));

    await termometro.ocioso();
    await waitFor(() => expect(api.ativas()).toEqual([]));
  });

  it('categoria, descrição e cartão parcelado vão para a planilha', async () => {
    const { api, termometro } = await renderizarApp();
    const usuario = await abrirLancar();
    await digitar(usuario, '300');
    await usuario.press(screen.getByRole('radio', { name: 'Compras' }));
    await usuario.type(screen.getByLabelText('Descrição'), 'Tênis');
    await usuario.press(await screen.findByRole('radio', { name: 'Inter' }));
    await usuario.press(screen.getByRole('button', { name: 'Mais parcelas' }));
    await usuario.press(screen.getByRole('button', { name: 'Mais parcelas' }));

    await usuario.press(screen.getByRole('button', { name: 'Lançar R$ 300,00' }));
    await termometro.ocioso();

    const linhas = api.ativas();
    expect(linhas).toHaveLength(3);
    expect(linhas[0]).toMatchObject({
      categoria: 'Compras',
      descricao: 'Tênis',
      meio: 'cartao',
      cartao: 'INTER',
      parcelas: 3,
    });
  });

  it('parece um previsto: confirma em vez de criar', async () => {
    const { api, termometro } = await renderizarApp();
    const r = await termometro.lancar({
      data: termometro.estado.hoje,
      valorCentavos: 250_000,
      tipo: 'saida',
      quem: 'Thays',
      meio: 'avista',
      descricao: 'Aluguel',
    });
    await termometro.ocioso();
    const id = r.ok ? (r.ids[0] as string) : '';
    api.editarAMao(id, { status: 'previsto' });
    await termometro.atualizar();

    const usuario = await abrirLancar();
    await usuario.press(screen.getByRole('radio', { name: 'Saída' }));
    await digitar(usuario, '2500');
    await usuario.press(await screen.findByRole('button', { name: 'Confirmar em vez de criar' }));

    await termometro.ocioso();
    expect(api.ativas()).toHaveLength(1);
    expect(api.linhas.get(id)?.status).toBe('confirmado');
  });

  it('Diário acima do limite pede confirmação; recusar não lança', async () => {
    const { api, dialogs, termometro } = await renderizarApp();
    dialogs.confirm.mockResolvedValueOnce(false);
    const usuario = await abrirLancar();
    await digitar(usuario, '250');

    await usuario.press(screen.getByRole('button', { name: 'Lançar R$ 250,00' }));

    expect(dialogs.confirm).toHaveBeenCalledWith('Lançar R$ 250,00 no Diário?');
    await termometro.ocioso();
    expect(api.ativas()).toEqual([]);
  });
});
