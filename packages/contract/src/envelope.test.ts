import { describe, expect, it } from 'vitest';
import { falha, requisicaoSchema, sucesso, VERSAO_CONTRATO, VERSOES_ACEITAS } from './envelope';

describe('requisicaoSchema', () => {
  it('aceita um ping válido', () => {
    const resultado = requisicaoSchema.safeParse({
      v: VERSAO_CONTRATO,
      token: 'abc',
      action: 'ping',
      payload: null,
    });
    expect(resultado.success).toBe(true);
  });

  it.each([
    ['sem token', { v: 1, token: '', action: 'ping', payload: null }],
    ['ação desconhecida', { v: 1, token: 'abc', action: 'apagarTudo', payload: null }],
    ['versão fracionária', { v: 1.5, token: 'abc', action: 'ping', payload: null }],
    ['não é objeto', 'ping'],
  ])('recusa requisição %s', (_, corpo) => {
    expect(requisicaoSchema.safeParse(corpo).success).toBe(false);
  });
});

describe('versões aceitas', () => {
  it('inclui a versão atual', () => {
    expect(VERSOES_ACEITAS).toContain(VERSAO_CONTRATO);
  });
});

describe('respostas', () => {
  it('monta o envelope de sucesso e de falha', () => {
    expect(sucesso(1)).toEqual({ ok: true, data: 1 });
    expect(falha('UNAUTHORIZED', 'token inválido')).toEqual({
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'token inválido' },
    });
  });
});
