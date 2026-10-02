// Menu "Criar aba do próximo ano" (PROJECT.md, 7): copia o layout, aplica fórmulas e estende a geração.
import { anosComAba, formulaSaldoDeAbertura } from './ano';
import { avisar, comLock, confirmar, dataDeCorte } from './contexto';
import { celulasDoDia } from './formulas';
import { aplicarFormulasNoAno, executarGeracao, local } from './menu';
import { abaObrigatoria, letrasAtuais, planilha } from './planilha';

export function criarAbaDoProximoAno(): void {
  comLock(() => {
    const ultimo = anosComAba(
      planilha()
        .getSheets()
        .map((aba) => aba.getName()),
    ).at(-1);
    if (ultimo === undefined) throw new Error('Nenhuma aba de ano (2026, 2027…) encontrada.');
    const novo = ultimo + 1;
    if (!confirmar(`Criar a aba ${novo} com o layout de ${ultimo}?`)) return;

    const origem = abaObrigatoria(String(ultimo));
    const nova = origem.copyTo(planilha()).setName(String(novo));
    planilha().setActiveSheet(nova);
    planilha().moveActiveSheet(origem.getIndex() + 1);

    // O plano antigo (valores, fórmulas literais e notas) não vem junto: só o layout.
    for (let mes = 1; mes <= 12; mes++) {
      const primeiro = celulasDoDia(novo, mes, 1);
      nova.getRange(primeiro.linha, primeiro.entrada, 31, 3).clearContent().clearNote();
    }
    const janeiro = celulasDoDia(novo, 1, 1);
    nova.getRange(janeiro.linha, janeiro.saldo).setFormula(local(formulaSaldoDeAbertura(novo)));

    aplicarFormulasNoAno(novo, dataDeCorte(), letrasAtuais());
    avisar(`Aba ${novo} criada.\n${executarGeracao()}`);
  });
}
