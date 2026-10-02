import type { CodigoErro } from '@termometro/contract';
import { describe, expect, it } from 'vitest';
import { atrasoDaTentativa, destinoDaFalha } from './destino.ts';
import type { Operacao } from './operacao.ts';

const api = (codigo: CodigoErro) => ({ tipo: 'api' as const, codigo, mensagem: codigo });

describe('destinoDaFalha', () => {
  it.each<[Operacao['acao'], ReturnType<typeof api> | { tipo: 'rede'; mensagem: string }, string]>([
    ['lancar', { tipo: 'rede', mensagem: 'timeout' }, 'tentar-depois'],
    ['lancar', api('INTERNAL'), 'tentar-depois'],
    ['editar', api('UNAUTHORIZED'), 'bloquear-token'],
    ['excluir', api('UNSUPPORTED_VERSION'), 'bloquear-versao'],
    ['lancar', api('INVALID_PAYLOAD'), 'travar'],
    ['lancar', api('NOT_FOUND'), 'travar'],
    ['lancar', api('CONFLICT'), 'travar'],
    // Reenvio de uma exclusão que já tinha dado certo: a linha já está excluída.
    ['excluir', api('NOT_FOUND'), 'ja-aplicada'],
    ['excluir', api('CONFLICT'), 'conflito'],
    ['editar', api('NOT_FOUND'), 'sumiu'],
    // Pode ser reenvio de uma edição já aplicada; só relendo a linha se sabe.
    ['editar', api('CONFLICT'), 'verificar'],
  ])('%s com %o → %s', (acao, falha, destino) => {
    expect(destinoDaFalha(acao, falha)).toBe(destino);
  });
});

describe('atrasoDaTentativa', () => {
  it('dobra a cada tentativa, de 2 s até o teto de 5 min', () => {
    expect([1, 2, 3, 4].map(atrasoDaTentativa)).toEqual([2000, 4000, 8000, 16000]);
    expect(atrasoDaTentativa(30)).toBe(300000);
  });
});
