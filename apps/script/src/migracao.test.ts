import { describe, expect, it } from 'vitest';
import { definicao } from './esquema';
import {
  type CelulaDoPlano,
  gerarMigracao,
  linhasDaNota,
  parcelasDaFormula,
  planejarImportacao,
} from './migracao';
import { lerTabela } from './tabela';

const SEM_LANCAMENTOS = lerTabela([[...definicao('Lançamentos').colunas]]);

function celula(campos: Partial<CelulaDoPlano>): CelulaDoPlano {
  return {
    celula: '2026!BJ7',
    ano: 2026,
    mes: 11,
    dia: 5,
    coluna: 'saida',
    valor: '',
    formula: '',
    nota: '',
    ...campos,
  };
}

function diarioDoMes(mes: number, valor: number, dias = 30): CelulaDoPlano[] {
  return Array.from({ length: dias }, (_, i) =>
    celula({ mes, dia: i + 1, coluna: 'diario', valor }),
  );
}

describe('parcelasDaFormula', () => {
  it('lê somas simples, com decimais e negativos', () => {
    expect(parcelasDaFormula('=1800+120+250')).toEqual([1800, 120, 250]);
    expect(parcelasDaFormula('= 100 - 36.6')).toEqual([100, -36.6]);
    expect(parcelasDaFormula('=-5')).toEqual([-5]);
  });

  it('lê a vírgula decimal da sintaxe pt-BR, que é como o Sheets devolve a fórmula', () => {
    expect(parcelasDaFormula('=42,69+40')).toEqual([42.69, 40]);
    expect(parcelasDaFormula('=13+15,6+100 + 70+254,5')).toEqual([13, 15.6, 100, 70, 254.5]);
    expect(parcelasDaFormula('=360,4-99,99')).toEqual([360.4, -99.99]);
  });

  it('recusa o que não é soma simples', () => {
    expect(parcelasDaFormula('=30*2')).toBeNull();
    expect(parcelasDaFormula('=SUM(A1:A3)')).toBeNull();
    expect(parcelasDaFormula('')).toBeNull();
    expect(parcelasDaFormula('=SOMA(1;2)')).toBeNull();
  });
});

describe('linhasDaNota', () => {
  it('separa as linhas, ignora vazias e reconhece ✅', () => {
    expect(linhasDaNota('Aluguel ✅\n\n  Internet \r\nEnergia')).toEqual([
      { texto: 'Aluguel', pago: true },
      { texto: 'Internet', pago: false },
      { texto: 'Energia', pago: false },
    ]);
  });
});

describe('gerarMigracao: Entrada e Saída', () => {
  it('uma linha por parcela, pareada com a nota na mesma ordem', () => {
    const { linhas } = gerarMigracao(
      [celula({ valor: 2170, formula: '=1800+120+250', nota: 'Aluguel\nInternet\nEnergia' })],
      SEM_LANCAMENTOS,
    );
    expect(linhas.map((l) => [l.descricao, l.valor, l.tipo, l.status, l.importar])).toEqual([
      ['Aluguel', 1800, 'saida', 'previsto', true],
      ['Internet', 120, 'saida', 'previsto', true],
      ['Energia', 250, 'saida', 'previsto', true],
    ]);
    expect(linhas[0]).toMatchObject({
      aviso: '',
      celula: '2026!BJ7',
      data: new Date(2026, 10, 5),
      quem: 'Nós dois',
      meio: 'avista',
      id: '',
    });
  });

  it('parcela negativa vira estorno do que estava na coluna', () => {
    const { linhas } = gerarMigracao(
      [celula({ valor: 63.4, formula: '=100-36.6', nota: 'Compra\nEstorno Ifood' })],
      SEM_LANCAMENTOS,
    );
    expect(linhas[1]).toMatchObject({ tipo: 'estorno', estorna: 'saida', valor: 36.6 });
  });

  it('avisa quando parcelas e linhas da nota não batem', () => {
    const { linhas } = gerarMigracao(
      [celula({ valor: 300, formula: '=100+200', nota: 'Só uma linha' })],
      SEM_LANCAMENTOS,
    );
    expect(linhas.map((l) => l.descricao)).toEqual(['Só uma linha', '']);
    expect(linhas[0]?.aviso).toBe('2 parcelas × 1 linhas na nota');
  });

  it('valor único com nota de várias linhas junta a descrição', () => {
    const { linhas } = gerarMigracao(
      [celula({ valor: 50, nota: 'Ração\nAreia' })],
      SEM_LANCAMENTOS,
    );
    expect(linhas.map((l) => l.descricao)).toEqual(['Ração / Areia']);
  });

  it('fórmula que não é soma simples importa o valor, com aviso', () => {
    const { linhas } = gerarMigracao([celula({ valor: 60, formula: '=30*2' })], SEM_LANCAMENTOS);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]?.valor).toBe(60);
    expect(linhas[0]?.aviso).toMatch(/não é uma soma simples/);
  });

  it('dia 31 em novembro vai para 30/11', () => {
    const { linhas } = gerarMigracao([celula({ dia: 31, valor: 3000 })], SEM_LANCAMENTOS);
    expect(linhas[0]).toMatchObject({
      data: new Date(2026, 10, 30),
      aviso: 'dia 31 movido para 2026-11-30',
    });
  });

  it('item já pago (✅) entra confirmado', () => {
    const { linhas } = gerarMigracao([celula({ valor: 10, nota: 'Claro ✅' })], SEM_LANCAMENTOS);
    expect(linhas[0]).toMatchObject({ descricao: 'Claro', status: 'confirmado' });
  });

  it('células vazias ou zero não geram linhas', () => {
    expect(gerarMigracao([celula({}), celula({ valor: 0 })], SEM_LANCAMENTOS).linhas).toEqual([]);
  });

  it('entrada negativa vem desmarcada para revisão', () => {
    const { linhas } = gerarMigracao([celula({ coluna: 'entrada', valor: -5 })], SEM_LANCAMENTOS);
    expect(linhas[0]).toMatchObject({
      importar: false,
      tipo: 'entrada',
      aviso: 'entrada negativa: revisar',
    });
  });

  it('item igual a um lançamento de recorrência do mesmo mês vem desmarcado', () => {
    const lancamentos = lerTabela([
      ['data', 'tipo', 'valor', 'recorrencia_id', 'excluido'],
      [new Date(2026, 10, 10), 'saida', 1800, 'aluguel', false],
    ]);
    const { linhas } = gerarMigracao(
      [celula({ valor: 1920, formula: '=1800+120', nota: 'Aluguel\nInternet' })],
      lancamentos,
    );
    expect(linhas.map((l) => l.importar)).toEqual([false, true]);
    expect(linhas[0]?.aviso).toBe('igual a um lançamento de recorrência já gerado');
  });

  it('descrição em 3 meses ou mais sugere recorrência', () => {
    const { linhas } = gerarMigracao(
      [10, 11, 12].map((mes) => celula({ mes, valor: 90, nota: 'Ração' })),
      SEM_LANCAMENTOS,
    );
    expect(linhas.every((l) => l.aviso === 'aparece em 3 meses: virar recorrência?')).toBe(true);
  });
});

describe('gerarMigracao: Diário', () => {
  it('o valor mais comum do mês vira a Previsão, sem lançamentos', () => {
    const { linhas, previsoes } = gerarMigracao(diarioDoMes(11, 30), SEM_LANCAMENTOS);
    expect(previsoes).toEqual([{ mes: '2026-11', diarioPorDia: 30 }]);
    expect(linhas).toEqual([]);
  });

  it('dia acima da previsão vira lançamento diario com a diferença', () => {
    const dias = diarioDoMes(11, 40);
    dias[9] = celula({ mes: 11, dia: 10, coluna: 'diario', valor: 115, nota: 'Aniversário' });
    const { linhas } = gerarMigracao(dias, SEM_LANCAMENTOS);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      tipo: 'diario',
      valor: 75,
      descricao: 'Aniversário',
      data: new Date(2026, 10, 10),
      importar: true,
    });
  });

  it('dia abaixo da previsão vem desmarcado com aviso', () => {
    const dias = diarioDoMes(11, 40);
    dias[0] = celula({ mes: 11, dia: 1, coluna: 'diario', valor: 0 });
    const { linhas } = gerarMigracao(dias, SEM_LANCAMENTOS);
    expect(linhas[0]).toMatchObject({ importar: false, tipo: 'estorno', valor: 40 });
    expect(linhas[0]?.aviso).toMatch(/abaixo da previsão/);
  });

  it('Diário no dia 31 de mês curto vira lançamento inteiro no último dia', () => {
    const dias = [
      ...diarioDoMes(11, 30),
      celula({ mes: 11, dia: 31, coluna: 'diario', valor: 30 }),
    ];
    const { linhas, previsoes } = gerarMigracao(dias, SEM_LANCAMENTOS);
    expect(previsoes).toEqual([{ mes: '2026-11', diarioPorDia: 30 }]);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ tipo: 'diario', valor: 30, data: new Date(2026, 10, 30) });
  });

  it('empate fica com o maior valor', () => {
    const dias = [
      ...diarioDoMes(12, 30, 2),
      ...diarioDoMes(12, 40, 2).map((c) => ({ ...c, dia: c.dia + 2 })),
    ];
    expect(gerarMigracao(dias, SEM_LANCAMENTOS).previsoes).toEqual([
      { mes: '2026-12', diarioPorDia: 40 },
    ]);
  });
});

describe('planejarImportacao', () => {
  const cabecalho = [
    'importar',
    'data',
    'tipo',
    'estorna',
    'valor',
    'descricao',
    'meio',
    'cartao',
    'quem',
    'categoria',
    'status',
    'id',
  ];
  const AGORA = new Date(2026, 9, 24);

  it('importa só as marcadas e ainda sem id, como migracao', () => {
    const migracao = lerTabela([
      cabecalho,
      [
        true,
        new Date(2026, 10, 5),
        'saida',
        '',
        1800,
        'Aluguel',
        'avista',
        '',
        'Nós dois',
        'Casa',
        'previsto',
        '',
      ],
      [
        false,
        new Date(2026, 10, 5),
        'saida',
        '',
        120,
        'Internet',
        'avista',
        '',
        'Nós dois',
        '',
        'previsto',
        '',
      ],
      [
        true,
        new Date(2026, 10, 5),
        'saida',
        '',
        250,
        'Energia',
        'avista',
        '',
        'Nós dois',
        '',
        'previsto',
        'ja-importado',
      ],
    ]);
    let n = 0;
    const plano = planejarImportacao(migracao, AGORA, () => `uuid-${n++}`);
    expect(plano.idsGravados).toEqual([{ linha: 2, id: 'uuid-0' }]);
    expect(plano.lancamentos).toEqual([
      {
        id: 'uuid-0',
        data: new Date(2026, 10, 5),
        valor: 1800,
        tipo: 'saida',
        estorna: '',
        categoria: 'Casa',
        descricao: 'Aluguel',
        quem: 'Nós dois',
        meio: 'avista',
        cartao: '',
        status: 'previsto',
        registrado_por: '',
        origem: 'migracao',
        criado_em: AGORA,
        atualizado_em: AGORA,
        excluido: false,
      },
    ]);
    expect(plano.avisos).toEqual([]);
  });

  it('linha inválida é avisada e não importada', () => {
    const migracao = lerTabela([
      cabecalho,
      [true, '', 'saida', '', 10, '', 'avista', '', '', '', '', ''],
      [true, new Date(2026, 10, 5), 'saida', '', 0, '', 'avista', '', '', '', '', ''],
      [true, new Date(2026, 10, 5), 'saida', '', 10, '', 'avista', '', '', '', 'pago', ''],
      [true, new Date(2026, 10, 5), 'saida', '', 10, '', 'cartao', '', '', '', '', ''],
    ]);
    const plano = planejarImportacao(migracao, AGORA, () => 'x');
    expect(plano.lancamentos).toEqual([]);
    expect(plano.avisos).toEqual([
      'Migração, linha 2: data inválida',
      'Migração, linha 3: valor inválido',
      'Migração, linha 4: status inválido',
      'Migração, linha 5: meio cartão sem cartão',
    ]);
  });
});
