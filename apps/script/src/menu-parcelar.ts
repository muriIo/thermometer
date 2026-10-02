// Menu "Parcelar linha selecionada". A lógica está em parcelar-linha.ts.
import { avisar, comLock } from './contexto';
import { ABAS } from './esquema';
import { planejarParcelamento } from './parcelar-linha';
import { acrescentar, atualizar, ler, planilha } from './planilha';

export function parcelarLinhaSelecionada(): void {
  comLock(() => {
    const ativa = planilha().getActiveSheet();
    if (ativa.getName() !== ABAS.lancamentos) {
      avisar(`Selecione uma linha na aba ${ABAS.lancamentos}.`);
      return;
    }
    const linha = ativa.getActiveRange()?.getRow() ?? 0;
    const lida = ler(ABAS.lancamentos);
    const registro = lida.tabela.registros.find((r) => r.linha === linha);
    if (!registro) {
      avisar('A linha selecionada está vazia.');
      return;
    }
    const plano = planejarParcelamento(registro, new Date(), () => Utilities.getUuid());
    if (typeof plano === 'string') {
      avisar(`Não parcelado: ${plano}.`);
      return;
    }
    atualizar(ABAS.lancamentos, lida, linha, plano.primeira);
    acrescentar(ABAS.lancamentos, plano.demais);
    avisar(`Linha ${linha} dividida em ${plano.demais.length + 1} parcelas.`);
  });
}
