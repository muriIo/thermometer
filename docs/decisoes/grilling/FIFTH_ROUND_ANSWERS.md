---

❓ Q28 - Data de corte: Para a migração ficar limpa, o corte deve cair num dia 24, logo depois de um fechamento. Assim:
- a fatura que vence no dia 1 seguinte tem só compras de antes do corte e vira uma única linha previsto "Fatura Inter — compras antes do corte";
- todas as faturas depois dela são calculadas 100% pela aba Lançamentos.

Um corte no dia 1 de um mês deixaria a fatura seguinte metade manual e metade calculada.

- (a) 24/10/2026. Sobram ~3 semanas para a Fase 1 inteira (abas, fórmulas, menu, migração, validação na Teste). É apertado.
- (b) 24/11/2026. Sobram ~7 semanas, com folga.
- (c) O primeiro dia 24 depois que a Fase 1 cumprir o critério de pronto, sem data fixa.

➡️ (c), com a meta de 24/10 e 24/11 como plano B. Uma data fixa incentiva virar a planilha real sem a validação terminar, e é aí que se perde dinheiro na planilha.

---

❓ Q29 - Dia de pagamento da fatura e critério da Fase 1:
- Fato: no plano atual, a soma do cartão de novembro está no dia 2, mas o vencimento é dia 1. Vocês pagam no dia 2 por costume, ou é só o lugar onde foi digitado? Isso decide se o cadastro precisa de uma coluna dia_pagamento, separada do vencimento.
- Critério: a Fase 1 dizia "reproduzir os saldos centavo por centavo". Mas duas mudanças decididas fazem alguns dias mudarem:
  - os itens do "dia 31" de meses de 30 dias passam para o dia 30;
  - a fatura passa a cair no vencimento.

  Proponho o critério: saldo do fim de cada mês idêntico, centavo por centavo, de out/2026 a dez/2027, e cada diferença em dias intermediários explicada por uma dessas duas regras, numa lista gerada pelo script.

➡️ Fato: com você. Critério: como proposto.

- Não quero que as coisas fiquem engessadas, posso pagar no dia 1, quanto posso pagar no dia 25. As coisas futuras são somente uma forma de extrapolar e termos controle das finanças.

---

❓ Q30 - Como registrar as decisões: O documento prevê docs/decisoes/ (ADRs). Saíram ~30 decisões destas rodadas.
- (a) Reescrever o PROJECT.md com o modelo novo (seções 3, 5, 6, 9, 17, 18 mudam bastante) e criar ADRs curtos só para as decisões grandes. Seriam umas 8: Angular Native + registro de bugs; planilha antes do app; status previsto/confirmado; data_caixa e cartão; parcelamento ≠ recorrência; conflito por hash; saldo lido da planilha; data de corte num dia 24.
- (b) Só reescrever o PROJECT.md.
- (c) Um ADR para cada decisão.

E os arquivos *_ROUND_ANSWERS.md: depois da consolidação, apago ou movo para docs/decisoes/grilling/ como registro?

➡️ (a), e mover os arquivos de respostas. Eles mostram por que cada escolha foi feita, e isso ajuda quando um agente for mexer no projeto depois.

---
