# 0003 — Futuro como linhas `previsto` na aba Lançamentos

- Status: aceita
- Data: 2026-10-01

## Contexto
A planilha atual é também um plano: contas fixas, salários e parcelas pré-preenchidos até dez/2027, marcados com ✅ quando pagos. Ao transformar Entrada/Saída/Diário em fórmulas, o plano precisa de um lugar. O casal quer fazer tudo tanto na planilha quanto no app, e o futuro é só projeção.

## Decisão
- O futuro é guardado como linhas reais da aba Lançamentos com `status = previsto`. Pagar = marcar `confirmado` (ajustando valor/data se mudou).
- As fórmulas somam previstos e confirmados igualmente; previsto vencido continua contando e aparece como "a confirmar" no app.
- Exceção: a previsão do Diário é um valor por dia por mês (aba `Previsão`), não linhas.
- Recorrências são regras (aba `Recorrentes`) que geram previstos até o horizonte.

## Alternativas consideradas
- **Regras calculadas por fórmula:** decidir qual lançamento real "baixa" qual previsto em fórmula de planilha é inviável.
- **Só Diário como fórmula, Entrada/Saída manuais:** mais simples, mas o app não poderia lançar nem confirmar contas.

## Consequências
- Risco de duplicar ao lançar algo já previsto; mitigado pela detecção no Lançar e pela lista "A confirmar".
- A aba Lançamentos cresce (recorrências até o horizonte); aceitável.
