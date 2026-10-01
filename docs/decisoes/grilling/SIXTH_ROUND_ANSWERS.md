---

❓ Q31 - Fatura como entidade, com data de pagamento móvel: Uma aba nova Faturas, com uma linha por cartão por ciclo e estas colunas:

id · cartão · fecha_em · vence_em · pago_em · total · status

- pago_em vazio significa que a fatura ainda não foi paga.
- total é uma fórmula: a soma das compras da fatura (exceto as excluídas) menos os estornos.

Cada compra no cartão guarda fatura_id em vez de data_caixa, e o script preenche esse campo pela data e pelo cartão. Nas fórmulas dos blocos, a Saída do dia passa a somar:
- os lançamentos à vista pela própria data, e
- o total das faturas cuja data efetiva (pago_em, ou vence_em se pago_em estiver vazio) é aquele dia.

Na prática:
- Pagar a fatura é preencher pago_em, na planilha ou com um botão "Pagar fatura" no app (fase posterior). O valor se move sozinho para o dia escolhido, sem reescrever nenhuma compra.
- As linhas de Faturas são geradas pelo mesmo comando de menu das recorrências, até o horizonte (dez do ano seguinte).
- Na migração, a fatura de novembro recebe pago_em = dia 2, como está no plano. A única diferença diária que sobra na validação é a regra do dia 31.
- A linha "Fatura Inter — compras antes do corte" vira uma compra no cartão com fatura_id dessa fatura, e o "Ajuste de fatura" funciona do mesmo jeito.

➡️ Adotar. Substitui a data_caixa da Q24 e fica mais robusto a edições manuais, porque mudar uma data numa célula basta e não é preciso rodar "Normalizar".

---

❓ Q32 - Pagamento parcial ou antecipado da fatura: Quando você paga no dia 25, é o total da fatura que fechou no dia 24? Ou às vezes você paga parte de uma fatura, ou antecipa parte da próxima?
- (a) Sempre o total, com uma data só (pago_em).
- (b) Pode ser parcial. Nesse caso Faturas vira uma tabela de pagamentos (fatura, data, valor), e o restante continua projetado no vencimento.

➡️ (a) no MVP, se for o que vocês fazem hoje. Um pagamento parcial raro pode ser lançado como um "Ajuste de fatura" negativo nesta fatura e um positivo na próxima, sem modelo novo.

---
