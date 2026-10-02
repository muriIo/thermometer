import { provideIcons } from '@ng-icons/core';
import * as lucide from '@ng-icons/lucide';
import { CATEGORIAS_GASTO, CATEGORIAS_RECEITA } from '@termometro/dominio';

/** Ícones das telas; os das categorias vêm de `Categoria.icone`, no domínio. */
const DAS_TELAS = [
  'calendar',
  'check',
  'chevron-left',
  'chevron-right',
  'clock',
  'delete',
  'minus',
  'plus',
  'refresh-cw',
  'thermometer',
  'triangle-alert',
  'wifi-off',
  'x',
];

const nomes = [...DAS_TELAS, ...[...CATEGORIAS_GASTO, ...CATEGORIAS_RECEITA].map((c) => c.icone)];

/** `heart-pulse` → `lucideHeartPulse`, o nome do export no `@ng-icons/lucide`. */
function chave(nome: string): string {
  return `lucide${nome.replace(/(^|-)(\w)/g, (_, _hifen, letra: string) => letra.toUpperCase())}`;
}

const svgs = lucide as unknown as Record<string, string | undefined>;

/**
 * Os ícones Lucide do app. No template: `name="lucide-<nome>"`. O Metro não
 * descarta exports sem uso, então o pacote inteiro já vai no bundle; a lista
 * só diz quais nomes o `NgIcon` conhece.
 */
export const ICONES = provideIcons(
  Object.fromEntries(
    nomes.flatMap((nome) => {
      const svg = svgs[chave(nome)];
      return svg ? [[chave(nome), svg]] : [];
    }),
  ),
);
