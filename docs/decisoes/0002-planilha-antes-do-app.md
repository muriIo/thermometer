# 0002 — Planilha antes do app

- Status: aceita
- Data: 2026-10-01

## Contexto
O escopo cresceu: previstos, recorrências, cartão com faturas, parcelamento e estorno. O maior risco passou a ser o modelo da planilha, não o app.

## Decisão
Ordem das fases: fundação do repositório → modelo da planilha na Planilha Teste (com migração do plano e validação centavo a centavo) → virada da planilha real e 2–4 semanas de uso só pela planilha → API do script → app MVP.

## Alternativas consideradas
- **App e API antes da virada:** a planilha só mudaria com o app pronto; erros do modelo apareceriam junto com erros do app.

## Consequências
- Durante a Fase 2, lançar pelo celular continua tão lento quanto hoje.
- Erros de modelo são descobertos editando linhas à mão, com custo baixo.
