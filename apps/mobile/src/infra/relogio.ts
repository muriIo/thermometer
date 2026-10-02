import { type DataISO, dataISO } from '@termometro/dominio';
import type { Agendador, Portas } from '../aplicacao/portas.ts';

/** "Hoje" no fuso do aparelho: a data em que a pessoa está, não a de Greenwich. */
export function relogioDoAparelho(agora: () => Date = () => new Date()): Portas['relogio'] {
  return {
    hoje: (): DataISO => {
      const d = agora();
      const dois = (n: number) => String(n).padStart(2, '0');
      return dataISO(`${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`);
    },
    agora: () => agora().getTime(),
  };
}

export const agendadorComTimers: Agendador = {
  agendar(ms, tarefa) {
    const id = setTimeout(tarefa, ms);
    return () => clearTimeout(id);
  },
};
