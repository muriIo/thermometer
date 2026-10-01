import { describe, expect, it } from 'vitest';
import { localizarFormula, separadorDaLocalidade } from './sintaxe';

describe('separadorDaLocalidade', () => {
  it('pt-BR e outras de vírgula decimal usam ponto e vírgula', () => {
    expect(separadorDaLocalidade('pt_BR')).toBe(';');
    expect(separadorDaLocalidade('de_DE')).toBe(';');
  });

  it('inglês usa vírgula', () => {
    expect(separadorDaLocalidade('en_US')).toBe(',');
    expect(separadorDaLocalidade('en-GB')).toBe(',');
  });
});

describe('localizarFormula', () => {
  it('troca o separador fora de aspas e preserva textos', () => {
    expect(localizarFormula('=IF(A1="a,b",SUM(1,2),"")', ';')).toBe('=IF(A1="a,b";SUM(1;2);"")');
  });

  it('não mexe em listas {"x";…} nem quando o separador já é vírgula', () => {
    expect(localizarFormula('={"total";MAP(A2:A,LAMBDA(id,id))}', ';')).toBe(
      '={"total";MAP(A2:A;LAMBDA(id;id))}',
    );
    expect(localizarFormula('=SUM(1,2)', ',')).toBe('=SUM(1,2)');
  });
});
