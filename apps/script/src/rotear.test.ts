import { VERSAO_CONTRATO } from '@termometro/contract';
import { describe, expect, it } from 'vitest';
import { type Ambiente, rotear } from './rotear';

const ambiente: Ambiente = {
  tokens: { 'token-murilo': 'Murilo', 'token-thays': 'Thays' },
  versaoScript: '0.0.0',
  agora: () => new Date('2026-10-01T12:00:00Z'),
};

const corpo = (dados: object) =>
  JSON.stringify({ v: VERSAO_CONTRATO, action: 'ping', payload: null, ...dados });

describe('rotear', () => {
  it('ping devolve o nome do dono do token', () => {
    expect(rotear(corpo({ token: 'token-thays' }), ambiente)).toEqual({
      ok: true,
      data: { versaoScript: '0.0.0', horaServidor: '2026-10-01T12:00:00.000Z', nome: 'Thays' },
    });
  });

  it('recusa token desconhecido', () => {
    const resposta = rotear(corpo({ token: 'token-murilx' }), ambiente);
    expect(resposta).toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('recusa JSON malformado', () => {
    expect(rotear('{', ambiente)).toMatchObject({ ok: false, error: { code: 'INVALID_PAYLOAD' } });
  });

  it('recusa versão de contrato não suportada', () => {
    const resposta = rotear(corpo({ token: 'token-murilo', v: 99 }), ambiente);
    expect(resposta).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED_VERSION' } });
  });
});
