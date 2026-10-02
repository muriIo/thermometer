import { describe, expect, it } from 'vitest';
import { linhaNovaSchema, PAYLOADS } from './acoes';

const LINHA = {
  id: '6f1c2a3b-0000-4000-8000-000000000001',
  data: '2026-11-05',
  valorCentavos: 800,
  tipo: 'diario',
  categoria: 'Alimentação',
  descricao: 'Salgado',
  quem: 'Thays',
  meio: 'avista',
  status: 'confirmado',
};

const motivo = (resultado: { success: boolean; error?: { issues: { message: string }[] } }) =>
  resultado.error?.issues.map((i) => i.message).join('; ');

describe('linhaNovaSchema', () => {
  it('aceita uma linha válida, com e sem parcelamento', () => {
    expect(linhaNovaSchema.safeParse(LINHA).success).toBe(true);
    const parcela = { ...LINHA, grupoId: 'grupo-0001', parcelaN: 1, parcelas: 3 };
    expect(linhaNovaSchema.safeParse(parcela).success).toBe(true);
  });

  it.each([
    ['valor zero', { valorCentavos: 0 }],
    ['valor fracionário', { valorCentavos: 8.5 }],
    ['data impossível', { data: '2026-02-30' }],
    ['tipo desconhecido', { tipo: 'gasto' }],
    ['campo a mais', { registradoPor: 'Murilo' }],
    ['id curto', { id: 'abc' }],
  ])('recusa %s', (_, campos) => {
    expect(linhaNovaSchema.safeParse({ ...LINHA, ...campos }).success).toBe(false);
  });

  it('aplica as regras do domínio entre campos', () => {
    expect(motivo(linhaNovaSchema.safeParse({ ...LINHA, meio: 'cartao' }))).toBe(
      'meio cartão sem cartão',
    );
    expect(motivo(linhaNovaSchema.safeParse({ ...LINHA, categoria: 'Mercado' }))).toBe(
      'categoria inválida (Mercado)',
    );
  });

  it('parcelamento: os três campos juntos e parcelaN ≤ parcelas', () => {
    expect(motivo(linhaNovaSchema.safeParse({ ...LINHA, grupoId: 'grupo-0001' }))).toBe(
      'grupoId, parcelaN e parcelas vão juntos',
    );
    const invertido = { ...LINHA, grupoId: 'grupo-0001', parcelaN: 4, parcelas: 3 };
    expect(motivo(linhaNovaSchema.safeParse(invertido))).toBe('parcelaN maior que parcelas');
  });
});

describe('PAYLOADS', () => {
  it('lancar exige ao menos uma linha', () => {
    expect(PAYLOADS.lancar.safeParse({ linhas: [] }).success).toBe(false);
    expect(PAYLOADS.lancar.safeParse({ linhas: [LINHA] }).success).toBe(true);
  });

  it('editar aceita só campos editáveis; estorna vazia remove o estorno', () => {
    const base = { id: LINHA.id, versaoVista: 'abc' };
    expect(PAYLOADS.editar.safeParse({ ...base, status: 'confirmado' }).success).toBe(true);
    expect(PAYLOADS.editar.safeParse({ ...base, estorna: '' }).success).toBe(true);
    expect(PAYLOADS.editar.safeParse({ ...base, grupoId: 'x' }).success).toBe(false);
  });

  it('excluir exige escopo conhecido; listar e resumo exigem datas', () => {
    const base = { id: LINHA.id, versaoVista: 'abc' };
    expect(PAYLOADS.excluir.safeParse({ ...base, escopo: 'so_esta' }).success).toBe(true);
    expect(PAYLOADS.excluir.safeParse({ ...base, escopo: 'todas' }).success).toBe(false);
    expect(PAYLOADS.listar.safeParse({ de: '2026-11-01', ate: '2026-11-30' }).success).toBe(true);
    expect(PAYLOADS.resumo.safeParse({ data: 'hoje' }).success).toBe(false);
  });

  it('ping e referencias não têm payload', () => {
    expect(PAYLOADS.ping.safeParse(null).success).toBe(true);
    expect(PAYLOADS.referencias.safeParse(undefined).success).toBe(true);
  });
});
