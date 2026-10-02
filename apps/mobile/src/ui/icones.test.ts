import * as lucide from '@ng-icons/lucide';
import { CATEGORIAS_GASTO, CATEGORIAS_RECEITA } from '@termometro/dominio';
import { expect, it } from 'vitest';

it('toda categoria do domínio tem um ícone Lucide que existe', () => {
  const svgs = lucide as unknown as Record<string, unknown>;
  const faltando = [...CATEGORIAS_GASTO, ...CATEGORIAS_RECEITA]
    .map((c) => c.icone)
    .filter(
      (nome) => !svgs[`lucide${nome.replace(/(^|-)(\w)/g, (_, _h, l: string) => l.toUpperCase())}`],
    );
  expect(faltando).toEqual([]);
});
