# Glossário do domínio

Linguagem comum entre planilha, código e conversa. Identificadores de domínio no código usam estes nomes em português, sem acento (`lancamento`, `fatura`, `previsto`). Termo novo entra aqui no mesmo PR que o introduz.

| Termo | Significado |
|---|---|
| **Lançamento** | Uma linha da aba `Lançamentos`: um gasto, uma receita ou um estorno, real ou previsto. |
| **Tipo** | `entrada`, `saida`, `diario` ou `estorno`. Define em que coluna do bloco o lançamento pesa. |
| **Diário** | Gastos pequenos do dia a dia (o salgado). Tem previsão por dia. |
| **Saída** | Contas e gastos maiores. Também recebe o total das faturas. |
| **Entrada** | Receitas (salário, rendimentos, reembolsos). |
| **Estorno** | Valor positivo que desconta do Diário ou da Saída (campo `estorna`). No cartão, desconta da fatura. |
| **Meio** | `avista` (dinheiro sai na data) ou `cartao` (dinheiro sai na fatura). |
| **Previsto** | Lançamento planejado, ainda não confirmado. Conta no saldo igual a um confirmado. |
| **Confirmado** | Lançamento que aconteceu. Substitui o ✅ das notas antigas. |
| **A confirmar** | Previsto de hoje ou vencido que ainda não foi confirmado. |
| **Recorrência** | Regra (aba `Recorrentes`) que gera previstos todo mês. Editada "daqui para a frente". |
| **Parcelamento** | Um total dividido em N parcelas com o mesmo `grupo_id`. Não é recorrência. |
| **Fatura** | Ciclo de um cartão: fecha num dia, vence noutro, é paga numa data livre (`pago_em`). Total = soma das compras do ciclo. |
| **Data efetiva da fatura** | `pago_em`, ou `vence_em` se ainda não paga. É quando o total pesa na Saída. |
| **Ajuste de fatura** | Lançamento no cartão para a soma bater com o valor real da fatura. |
| **Data** (`data`) | Dia do consumo/compra. |
| **Data de caixa** (`data_caixa`) | Dia em que o dinheiro efetivamente sai ou entra. |
| **Consumo** | Quanto se gastou num dia, pela data da compra, à vista + cartão; parcelado conta o total. O termômetro mostra o consumo do Diário (`consumoDoDiario`), menos estornos do Diário. |
| **Caixa** | Quanto saiu da conta num dia. É o que os blocos da planilha mostram. |
| **Termômetro** | Comparação do consumo de hoje com a previsão do Diário (tela Hoje). |
| **Previsão** | Valor de Diário esperado por dia, por mês (aba `Previsão`). |
| **Bloco** | As 5 colunas de um mês nas abas de ano (Data, Entrada, Saída, Diário, Saldo). |
| **Saldo** | Fórmula corrida da planilha, de 01/01/2026 em diante. O app só lê, nunca calcula. |
| **Data de corte** | Dia a partir do qual Entrada/Saída/Diário dos blocos viram fórmulas. Sempre um dia 24. |
| **Horizonte** | Até onde recorrências e faturas são geradas: 31/12 do ano seguinte. |
| **Quem** | Quem gastou/recebeu: Murilo, Thays ou Nós dois. |
| **Registrado por** | Dono do token que gravou a linha. Auditoria. |
| **Versão** (`versao`) | Hash dos campos de negócio de uma linha, usado para detectar conflito. |
| **Fila** | Operações do app ainda não enviadas ao script. |
| **Espelho** | Cópia, no aparelho, das linhas como a planilha devolveu. Nunca recebe nada pendente. |
| **Projeção** | O espelho com a fila aplicada por cima: o que a tela mostra. |
| **Travada** | Operação que o script recusou de um jeito que reenviar não resolve. Fica visível até o usuário descartar. |
| **Estimado** | Saldo ou consumo que soma ao último valor lido da planilha o que ela ainda não inclui (pendentes, sem rede). |
