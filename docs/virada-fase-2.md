# Virada da planilha real (Fase 2)

Roteiro para repetir na planilha real o que foi validado na Planilha Teste (PROJECT.md, 9 e 18). Quem executa é o Murilo; nada aqui é feito por agente.

- **Corte:** 24/10/2026 ([ADR 0008](decisoes/0008-data-de-corte-dia-24.md)).
- **Quando executar:** na **noite de 23/10**, depois do último lançamento do dia no jeito antigo. No dia 24 em diante o Diário de dias passados deixa de usar a Previsão, e o relatório de validação acusaria diferenças que não são erro.
- **Duração:** ~1 h, quase toda na revisão da aba `Migração`.

## Antes (até 22/10)

1. PR da Fase 1 e da preparação da Fase 2 mergeados; `pnpm verify` verde na `main`.
2. Na planilha real: *Extensões → Apps Script* cria o projeto preso a ela. Copie o ID (*Configurações do projeto*).
3. `cp apps/script/.clasp.real.json.example apps/script/.clasp.real.json` e cole o ID.
4. **Ainda não** crie `PERMITIR_PLANILHA_REAL`. Faça `pnpm --filter @termometro/script push:real`, recarregue a planilha real e confira que o menu "Termômetro" aparece e que "Preparar abas" responde *"Esta é a planilha real. A escrita está bloqueada…"*. Isso prova que a trava funciona.
5. Revise as regras da aba `Recorrentes` da Planilha Teste contra o plano atual da real (valores podem ter mudado desde 01/10).

## Noite de 23/10

| # | Onde | Passo | Conferir |
|---|---|---|---|
| 1 | Real | *Arquivo → Fazer uma cópia* → "Backup pré-migração 2026-10-23 — NÃO EDITAR". Não abra o menu nessa cópia. | A cópia existe no Drive. |
| 2 | Apps Script da real | *Configurações do projeto → Propriedades do script*: `PERMITIR_PLANILHA_REAL` = `sim`. | — |
| 3 | Real | **Preparar abas**. | Cabeçalhos ƒ sem `#ERROR!` (`fatura_id`, `data_caixa`, `data_efetiva`, `total`, `status`). |
| 4 | Real | `Config`: `data_corte` = 24/10/2026. `Cartões`: linha do Inter. | — |
| 5 | Real | `Recorrentes`: cole as colunas **B:M** (sem o `id`) da Planilha Teste. | 23 regras. |
| 6 | Real | **Migração: registrar saldos atuais**. **Antes de qualquer fórmula.** | Aba `Validação` com ~465 linhas. |
| 7 | Real | **Gerar recorrências e faturas**. | Sem avisos de regra inválida. |
| 8 | Real | **Migração: gerar aba Migração** e revise (abaixo). | — |
| 9 | Real | **Migração: importar aba Migração**. | "N lançamentos importados", sem avisos. |
| 10 | Real | **Aplicar fórmulas a partir do corte** → **Verificar fórmulas**. | "Tudo certo". |
| 11 | Real | **Migração: relatório de validação**. | Só as diferenças esperadas (abaixo). |

### Revisão da aba Migração

As mesmas decisões tomadas na Planilha Teste:

- **Receita** (R$ 254,50): a regra termina em 31/01/2027; desmarque as linhas "Receita 7/8" de fev a dez/2027.
- **Fatura de 02/11** (compras no cartão antes do corte): desmarque todas as linhas do dia 02/11 e acrescente uma linha:

  | importar | data | tipo | valor | descricao | quem | meio | cartao | status |
  |---|---|---|---|---|---|---|---|---|
  | ✓ | 23/10/2026 | saida | *total da fatura* | Fatura Inter — compras antes do corte | Nós dois | cartao | INTER | confirmado |

  Depois, em `Faturas`, `pago_em` = 02/11/2026 na linha `INTER-2026-10`.
- **Fatura de 02/12** (parcelas no cartão): fica como saídas à vista no dia 2.
- Linhas desmarcadas com "igual a um lançamento de recorrência já gerado" ficam desmarcadas.
- "N parcelas × M linhas na nota": os valores estão certos; corrija descrições se quiser.

### Relatório esperado

- Fim de mês: diferença só a partir de fev/2027, de +R$ 254,50 por mês (Receita encerrada).
- Dias: diferenças só pela regra do dia 31 e pelo mesmo acumulado da Receita.

Qualquer outra diferença: **pare**, não lance nada e investigue antes do dia 24.

### Se der errado

Restaure as abas `2026` e `2027` a partir do backup (*clicar com o botão direito na aba → Copiar para → planilha real*, renomear) e apague `PERMITIR_PLANILHA_REAL`. As abas novas podem ficar; sem fórmulas nos blocos, elas não afetam o saldo.

## Do dia 24 em diante: lançando direto na planilha

Tudo vai para a aba `Lançamentos`, uma linha por item. As listas suspensas mostram os valores aceitos. Nunca escreva nas colunas `fatura_id` e `data_caixa`.

| Situação | Como lançar |
|---|---|
| Gasto do dia (salgado) | `data`, `valor`, `tipo` = diario, `meio` = avista, `status` = confirmado. |
| Conta / gasto maior | Igual, com `tipo` = saida. |
| Compra no cartão | `meio` = cartao, `cartao` = INTER. A fatura certa sai sozinha em `fatura_id`. |
| Parcelado | Uma linha com o **total** e `parcelas` = N; selecione a linha e use **Parcelar linha selecionada**. |
| Estorno | `tipo` = estorno, `estorna` = diario ou saida, valor positivo. No cartão, desconta da fatura. |
| Confirmar um previsto | Ajuste `valor`/`data` se mudou e troque `status` para confirmado. |
| Excluir | Marque `excluido`. Não apague a linha. |
| Pagar a fatura | Em `Faturas`, preencha `pago_em` com o dia do pagamento. |
| Fatura real ≠ soma | Lance um "Ajuste de fatura": saida no cartão (ou estorno, se negativo) na fatura daquele ciclo. |

Uma vez por semana: **Gerar recorrências e faturas** (dá `id` às linhas digitadas e estende a geração) e **Verificar fórmulas**.

## Critério de pronto da Fase 2

Um ciclo de fatura completo fechado sem divergência: a fatura `INTER-2026-11` (fecha 24/11, vence 01/12) com `total` igual ao valor cobrado pelo Inter, depois dos ajustes. Registre aqui cada ajuste no modelo que o uso pedir.

### Registro

| Data | O que aconteceu | Ajuste |
|---|---|---|
| | | |
