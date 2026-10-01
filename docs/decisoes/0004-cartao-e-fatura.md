# 0004 — Cartão de crédito: fatura como entidade e data de pagamento livre

- Status: aceita
- Data: 2026-10-01

## Contexto
O casal quer ver o gasto no dia da compra, mas o dinheiro só sai quando a fatura é paga. A data de pagamento varia (dia 1, dia 25…). Cartão inicial: Inter, fecha dia 24, vence dia 1.

## Decisão
- Lançamento tem `meio` (`avista` | `cartao`) e `cartao`.
- Aba `Cartões` (cadastro) e aba `Faturas` (uma linha por ciclo, com `pago_em` livre e `data_efetiva` = `pago_em` ou `vence_em`).
- Colunas calculadas na aba Lançamentos: `fatura_id` (pela data, cartão e parcela; compra no dia do fechamento ou depois vai para a fatura seguinte) e `data_caixa`.
- Blocos: compras no cartão não entram no Diário/Saída do dia; o total da fatura entra na Saída da data efetiva.
- O termômetro do app mede **consumo** (data da compra, à vista + cartão); a planilha mede **caixa**.
- Diferença entre soma e fatura real: lançamento "Ajuste de fatura". Pagamento sempre do total.

## Alternativas consideradas
- **Diário recebe a compra no cartão no dia:** saldo cairia antes do dinheiro sair.
- **`data_caixa` fixa gravada pelo script:** mudar o dia de pagamento exigiria reescrever todas as compras.
- **Fatura como uma linha única com o total:** compras do cartão não apareceriam como itens.
- **Tabela de pagamentos parciais:** desnecessária hoje; ajustes cobrem o caso raro.

## Consequências
- `fatura_id` e `data_caixa` são `ARRAYFORMULA` protegidas; o script nunca escreve nelas, e linhas manuais funcionam sem passo extra.
- A primeira fatura após o corte tem compras anteriores ao corte: entra como uma compra "Fatura Inter — compras antes do corte".
