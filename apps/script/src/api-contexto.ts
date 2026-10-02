/** O que todo caso de uso da API recebe, e as validações que dependem da planilha. */
import {
  type DataISO,
  deReais,
  horizonte,
  type Lancamento,
  problemaNosCampos,
  somarMeses,
} from '@termometro/dominio';
import { ABAS } from './esquema';
import type { Planilha } from './porta';
import { lerBooleano, lerData, lerTexto } from './tabela';

export type Contexto = {
  readonly planilha: Planilha;
  /** Dono do token: vai para `registrado_por`, nunca vem do payload. */
  readonly nome: string;
  readonly agora: Date;
  readonly hoje: DataISO;
};

export type Config = {
  readonly valorMaximoCentavos: number;
  readonly confirmarAcimaDiarioCentavos: number;
  readonly dataCorte: DataISO | null;
};

const PADRAO = { valor_maximo: 20000, confirmar_acima_diario: 2000 };

export function lerConfig(planilha: Planilha): Config {
  const valores = new Map(
    planilha.ler(ABAS.config).registros.map(({ dados }) => [lerTexto(dados.chave), dados.valor]),
  );
  const reais = (chave: keyof typeof PADRAO) => Number(valores.get(chave)) || PADRAO[chave];
  return {
    valorMaximoCentavos: deReais(reais('valor_maximo')),
    confirmarAcimaDiarioCentavos: deReais(reais('confirmar_acima_diario')),
    dataCorte: lerData(valores.get('data_corte')),
  };
}

export function cartoesAtivos(planilha: Planilha): Set<string> {
  const ativos = new Set<string>();
  for (const { dados } of planilha.ler(ABAS.cartoes).registros) {
    const ativo = lerTexto(dados.ativo) === '' || lerBooleano(dados.ativo);
    if (ativo && lerTexto(dados.id)) ativos.add(lerTexto(dados.id));
  }
  return ativos;
}

/**
 * Motivo para recusar um lançamento que vai ser gravado, ou `null`
 * (PROJECT.md, 7: validação). Data dentro de ±1 ano; parcelas podem ir até
 * o horizonte.
 */
export function problemaParaGravar(
  l: Lancamento,
  contexto: Contexto,
  config: Config,
  cartoes: ReadonlySet<string>,
): string | null {
  const problema = problemaNosCampos(l);
  if (problema) return problema;
  if (l.valorCentavos <= 0) return 'valor precisa ser positivo';
  if (l.valorCentavos > config.valorMaximoCentavos) {
    return `valor acima do máximo (${config.valorMaximoCentavos / 100})`;
  }
  const inicio = somarMeses(contexto.hoje, -12);
  const fim = l.grupoId ? horizonte(contexto.hoje) : somarMeses(contexto.hoje, 12);
  if (l.data < inicio || l.data > fim) return `data fora do intervalo ${inicio} a ${fim}`;
  if (l.meio === 'cartao' && !cartoes.has(l.cartao)) {
    return `cartão desconhecido ou inativo (${l.cartao})`;
  }
  return null;
}
