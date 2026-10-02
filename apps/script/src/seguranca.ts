/** Planilha real (PROJECT.md, 2). Desenvolvimento usa só a Planilha Teste. */
const ID_PLANILHA_REAL = '16NNZnx2Ef5JlJhNke1l8HnQ8OqDceGAUa9CsXT_3F3s';

/**
 * Trava contra escrever na planilha real por engano. Só a virada da Fase 2
 * cria a propriedade do script `PERMITIR_PLANILHA_REAL` = `sim`.
 */
export function podeEscrever(idPlanilha: string, permissao: string | null): boolean {
  return idPlanilha !== ID_PLANILHA_REAL || permissao === 'sim';
}
