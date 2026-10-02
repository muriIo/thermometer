import { describe, expect, it } from 'vitest';
import { linhaNova, opEditar, opExcluir, opLancar, salvo } from './dados.fixture.ts';
import { projetar } from './projecao.ts';

const porId = (lista: ReturnType<typeof projetar>) => new Map(lista.map((l) => [l.id, l]));

describe('projetar', () => {
  it('sem fila, mostra o espelho sincronizado', () => {
    const a = salvo({ id: 'a-00000001' });
    const [linha] = projetar([a], [], null);
    expect(linha).toMatchObject({ id: 'a-00000001', situacao: 'sincronizado', versao: a.versao });
  });

  it('lançamento na fila aparece como pendente, e enviando durante o envio', () => {
    const fila = [
      opLancar(1, [linhaNova({ id: 'n-00000001' })]),
      opLancar(2, [linhaNova({ id: 'n-00000002' })]),
    ];

    const linhas = porId(projetar([], fila, 'op-2'));

    expect(linhas.get('n-00000001')).toMatchObject({ situacao: 'pendente', versao: null });
    expect(linhas.get('n-00000002')?.situacao).toBe('enviando');
  });

  it('reenvio de um lançamento que a planilha já tem não duplica', () => {
    const fila = [opLancar(1, [linhaNova({ id: 'a-00000001' })])];
    expect(projetar([salvo({ id: 'a-00000001' })], fila, null)).toHaveLength(1);
  });

  it('edição pendente aparece aplicada, mantendo a versão vista', () => {
    const previsto = salvo({ id: 'p-00000001', status: 'previsto' });
    const fila = [
      opEditar(1, {
        id: 'p-00000001',
        edicao: { status: 'confirmado', valorCentavos: 950 },
        versaoVista: previsto.versao,
        versaoEsperada: 'x',
      }),
    ];

    const [linha] = projetar([previsto], fila, null);

    expect(linha).toMatchObject({
      status: 'confirmado',
      valorCentavos: 950,
      situacao: 'pendente',
      versao: previsto.versao,
    });
  });

  it('exclusão pendente esconde o alvo e as próximas parcelas', () => {
    const grupo = { grupoId: 'grupo-0001', parcelas: 3, meio: 'cartao' as const, cartao: 'INTER' };
    const espelho = [1, 2, 3].map((n) => salvo({ id: `p-0000000${n}`, parcelaN: n, ...grupo }));
    const fila = [opExcluir(1, { id: 'p-00000002', escopo: 'esta_e_proximas', versaoVista: 'v' })];

    expect(projetar(espelho, fila, null).map((l) => l.id)).toEqual(['p-00000001']);
  });

  it('operação travada marca as linhas que toca', () => {
    const fila = [opLancar(1, [linhaNova({ id: 'n-00000001' })], { travada: true })];
    expect(projetar([], fila, null)[0]?.situacao).toBe('travado');
  });

  it('edição de lançamento fora do espelho é ignorada', () => {
    const fila = [
      opEditar(1, { id: 'longe-0001', edicao: {}, versaoVista: 'v', versaoEsperada: 'v' }),
    ];
    expect(projetar([], fila, null)).toEqual([]);
  });
});
