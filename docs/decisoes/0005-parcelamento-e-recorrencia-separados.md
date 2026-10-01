# 0005 — Parcelamento e recorrência são conceitos separados

- Status: aceita
- Data: 2026-10-01

## Contexto
Os dois geram várias linhas a partir de uma regra. Qualquer lançamento pode ser parcelado; recorrências representam o modelo mensal (aluguel, salários…).

## Decisão
- **Parcelamento:** total + N; N linhas com `grupo_id`, `parcela_n`, `parcelas`; divisão em centavos com sobra na 1ª. Cartão: parcelas na data da compra, distribuídas pelas faturas, todas `confirmado`. À vista: parcela k em data + (k−1) meses; 1ª `confirmado`, demais `previsto`. Termômetro conta o total no dia da compra.
- **Recorrência:** regra editável na aba `Recorrentes`; linhas com `recorrencia_id`; edição "daqui para a frente" regenera só previstos futuros.
- A função de parcelamento vive em `packages/dominio` e é usada pelo app e pelo script.

## Alternativas consideradas
- **Um conceito único ("série"):** comportamentos diferentes (total que precisa fechar × regra sem total editada para a frente) complicariam os dois.

## Consequências
- Editar/excluir parcela pergunta "só esta" ou "esta e as próximas".
