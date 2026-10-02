import { describe, expect, it } from 'vitest';
import {
  dataISO,
  diaDe,
  diaDoMes,
  diasEntre,
  diasNoMes,
  mesDe,
  mesISO,
  somarDias,
  somarMeses,
  somarMesesAoMes,
} from './datas';

describe('dataISO', () => {
  it('aceita datas reais', () => {
    expect(dataISO('2026-10-24')).toBe('2026-10-24');
    expect(dataISO('2028-02-29')).toBe('2028-02-29');
  });

  it.each([
    '2026-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-00-10',
    '2026-10-00',
    '24/10/2026',
    '2026-10-24T00:00:00',
    '',
  ])('recusa %s', (texto) => {
    expect(() => dataISO(texto)).toThrow(RangeError);
  });
});

describe('mesISO', () => {
  it('aceita YYYY-MM', () => {
    expect(mesISO('2027-12')).toBe('2027-12');
  });

  it.each(['2027-13', '2027-00', '2027-1', '2027-12-01'])('recusa %s', (texto) => {
    expect(() => mesISO(texto)).toThrow(RangeError);
  });
});

describe('diasNoMes', () => {
  it('conhece meses curtos e fevereiro bissexto', () => {
    expect(diasNoMes(2026, 1)).toBe(31);
    expect(diasNoMes(2026, 4)).toBe(30);
    expect(diasNoMes(2026, 2)).toBe(28);
    expect(diasNoMes(2028, 2)).toBe(29);
    expect(diasNoMes(2100, 2)).toBe(28);
    expect(diasNoMes(2000, 2)).toBe(29);
  });
});

describe('diaDoMes', () => {
  it('dia que não existe no mês vira o último dia do mês', () => {
    expect(diaDoMes(mesISO('2026-04'), 31)).toBe('2026-04-30');
    expect(diaDoMes(mesISO('2027-02'), 30)).toBe('2027-02-28');
    expect(diaDoMes(mesISO('2028-02'), 31)).toBe('2028-02-29');
    expect(diaDoMes(mesISO('2026-10'), 1)).toBe('2026-10-01');
  });
});

describe('mesDe e diaDe', () => {
  it('separam o mês e o dia', () => {
    expect(mesDe(dataISO('2026-10-24'))).toBe('2026-10');
    expect(diaDe(dataISO('2026-10-04'))).toBe(4);
  });
});

describe('somarMesesAoMes', () => {
  it('vira o ano para a frente e para trás', () => {
    expect(somarMesesAoMes(mesISO('2026-11'), 2)).toBe('2027-01');
    expect(somarMesesAoMes(mesISO('2027-01'), -1)).toBe('2026-12');
    expect(somarMesesAoMes(mesISO('2026-10'), 0)).toBe('2026-10');
    expect(somarMesesAoMes(mesISO('2026-10'), 24)).toBe('2028-10');
  });
});

describe('somarMeses', () => {
  it('mantém o dia quando ele existe', () => {
    expect(somarMeses(dataISO('2026-10-06'), 3)).toBe('2027-01-06');
  });

  it('dia 31 em mês curto vira o último dia, sem arrastar para os meses seguintes', () => {
    const data = dataISO('2027-01-31');
    expect(somarMeses(data, 1)).toBe('2027-02-28');
    expect(somarMeses(data, 2)).toBe('2027-03-31');
    expect(somarMeses(data, 3)).toBe('2027-04-30');
  });

  it('respeita fevereiro bissexto', () => {
    expect(somarMeses(dataISO('2027-12-30'), 2)).toBe('2028-02-29');
  });
});

describe('somarDias', () => {
  it('atravessa fim de mês, fim de ano e fevereiro bissexto', () => {
    expect(somarDias(dataISO('2026-10-30'), 3)).toBe('2026-11-02');
    expect(somarDias(dataISO('2026-12-30'), 3)).toBe('2027-01-02');
    expect(somarDias(dataISO('2028-02-28'), 1)).toBe('2028-02-29');
    expect(somarDias(dataISO('2027-02-28'), 1)).toBe('2027-03-01');
  });

  it('volta dias com valor negativo', () => {
    expect(somarDias(dataISO('2026-11-01'), -3)).toBe('2026-10-29');
    expect(somarDias(dataISO('2027-01-01'), -1)).toBe('2026-12-31');
  });
});

describe('diasEntre', () => {
  it('conta dias de calendário, com sinal', () => {
    expect(diasEntre(dataISO('2026-10-30'), dataISO('2026-11-02'))).toBe(3);
    expect(diasEntre(dataISO('2026-11-02'), dataISO('2026-10-30'))).toBe(-3);
    expect(diasEntre(dataISO('2028-02-28'), dataISO('2028-03-01'))).toBe(2);
  });
});
