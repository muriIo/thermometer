/**
 * Menu "Parcelar linha selecionada" (Fase 2, lançando direto na planilha):
 * a linha com o total e `parcelas` = N vira as N parcelas, pela mesma função
 * do domínio que o app vai usar (PROJECT.md, 5.5).
 */
import { deReais, paraReais, parcelar, problemaNosCampos } from '@termometro/dominio';
import { lerCampos } from './campos';
import { escreverData, lerBooleano, lerData, lerTexto, type Registro } from './tabela';

export type Parcelamento = {
  /** Campos da linha selecionada, que vira a parcela 1. */
  readonly primeira: Record<string, unknown>;
  /** Parcelas 2..N, para acrescentar no fim. */
  readonly demais: Record<string, unknown>[];
};

export function planejarParcelamento(
  { dados }: Registro,
  agora: Date,
  novoId: () => string,
): Parcelamento | string {
  const data = lerData(dados.data);
  const valor = Number(dados.valor);
  const parcelas = Number(dados.parcelas);
  const campos = lerCampos(dados);
  if (lerTexto(dados.grupo_id)) return 'a linha já faz parte de um parcelamento';
  if (lerBooleano(dados.excluido)) return 'a linha está excluída';
  if (!data) return 'data vazia ou inválida';
  if (!Number.isFinite(valor) || valor <= 0) return 'valor inválido';
  if (!Number.isInteger(parcelas) || parcelas < 2) return 'preencha "parcelas" com 2 ou mais';
  const problema = problemaNosCampos(campos);
  if (problema) return problema;

  const linhas = parcelar(
    {
      ...campos,
      data,
      valorCentavos: deReais(valor),
      meio: campos.meio === 'cartao' ? 'cartao' : 'avista',
    },
    parcelas,
    novoId,
  ).map((parcela) => ({
    ...campos,
    id: parcela.id,
    data: escreverData(parcela.data),
    valor: paraReais(parcela.valorCentavos),
    status: parcela.status,
    grupo_id: parcela.grupoId,
    parcela_n: parcela.parcelaN,
    parcelas: parcela.parcelas,
    origem: lerTexto(dados.origem) || 'planilha',
    criado_em: dados.criado_em || agora,
    atualizado_em: agora,
    excluido: false,
  }));
  const [primeira, ...demais] = linhas;
  if (!primeira) return 'nada a parcelar';
  // A linha selecionada mantém o id que já tinha.
  return { primeira: { ...primeira, id: lerTexto(dados.id) || primeira.id }, demais };
}
