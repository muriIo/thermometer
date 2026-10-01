# 0007 — Saldo exibido no app é lido da planilha

- Status: aceita
- Data: 2026-10-01

## Contexto
O saldo é uma fórmula corrida desde 01/01/2026 e depende de valores manuais anteriores ao corte, que não estão em Lançamentos.

## Decisão
O `resumo` lê as células de Saldo do bloco (o script conhece o layout mês → colunas, dia → linha). Offline, o app mostra o último saldo recebido + pendentes, marcado "estimado".

## Alternativas consideradas
- **Recalcular a partir de Lançamentos:** divergiria da planilha e exigiria duplicar a lógica de saldo.

## Consequências
- O script depende do layout dos blocos; mudança de layout exige atualizar o mapeamento (documentado no PROJECT.md, seção 3).
