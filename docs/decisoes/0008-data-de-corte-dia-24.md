# 0008 — Data de corte: primeiro dia 24 após a validação

- Status: aceita
- Data: 2026-10-01

## Contexto
O Inter fecha no dia 24. Um corte em outro dia deixaria uma fatura metade manual, metade calculada.

## Decisão
O corte é o primeiro dia 24 depois que a Fase 1 cumprir o critério de pronto (saldos de fim de mês idênticos de out/2026 a dez/2027). Meta 24/10/2026; plano B 24/11/2026. A fatura que vence logo após o corte entra como uma compra "compras antes do corte".

## Alternativas consideradas
- **Data fixa:** incentiva virar a planilha real sem validação completa.
- **Dia 1 do mês:** fatura seguinte mista.

## Consequências
- Se um segundo cartão com outro fechamento entrar antes do corte, esta regra precisa ser revista.
