---

❓ Q23 - Cadastro de cartões:
- Onde fica: uma aba Cartões com id, nome, dono (Murilo/Thays/Nós dois), fechamento (dia), vencimento (dia) e ativo. No MVP é editada na planilha; no app, só leitura (para escolher o cartão ao lançar).
- Fato: quais cartões entram no começo, e com quais dias de fechamento e vencimento? Sem isso não dá para gerar as faturas nem migrar as "somas de cartão" que já estão no plano.

➡️ A aba como descrita. A lista de cartões é com você.

- Cartão Murilo (Banco INTER), fechamento em 24 e vencimento em 1. Limite de R$ 6.600,00.

---

❓ Q24 - Em que dia uma compra no cartão tira dinheiro do saldo: Proponho uma coluna nova na aba Lançamentos, data_caixa: o dia em que o dinheiro sai de fato. À vista, é a própria data. No cartão, é o vencimento da fatura em que a compra cai.
- As fórmulas dos blocos somam por data_caixa, que é o que manda no saldo.
- O termômetro do app soma por data, que mostra o consumo do dia.
- Regra do ciclo: compra feita no dia do fechamento ou depois cai na fatura seguinte.
- Quem preenche data_caixa: o script, ao gravar pelo app. Para uma linha digitada à mão na planilha, o script preenche na próxima leitura, ou por um item "Normalizar" no menu. Enquanto estiver vazia, a linha fica destacada.
- Fatura que não bate com a soma (juros, anuidade, algo que ninguém lançou): quando a fatura chega, você lança um "Ajuste de fatura" (Saída no cartão, pode ser negativo via Estorno) para a conta fechar.
- Compras feitas antes do corte: não estão em Lançamentos. As primeiras faturas depois do corte ganham uma linha previsto "Fatura X — compras antes do corte", que vem das somas de cartão já planejadas (ex.: o dia 2 de novembro).

➡️ Tudo como descrito. A alternativa seria guardar a fatura como uma linha única com o total, mas aí as compras do cartão não apareceriam como itens na planilha.

---

❓ Q25 - Como um parcelamento funciona: Você lança R$ 100 em 3×. Proposta:
- São gravadas 3 linhas com o mesmo grupo_id e a coluna parcela = "1/3", "2/3", "3/3". A divisão é feita em centavos: 33,34 + 33,33 + 33,33. A sobra vai para a 1ª parcela, para a soma dar o total exato.
- No cartão: a parcela k cai na k-ésima fatura a partir da compra. À vista ou pix parcelado (tipo "Gambiarra 06/10"): a parcela k cai no mesmo dia, k−1 meses depois. Um dia que não existe no mês vira o último dia do mês.
- Status: no cartão, todas as parcelas nascem confirmado, porque a compra já foi feita e o valor está comprometido. Fora do cartão, a 1ª nasce confirmado e as outras nascem previsto; cada uma é confirmada quando você paga.
- Termômetro (consumo do dia): conta o total no dia da compra. Do ponto de vista do consumo você gastou R$ 100, mesmo pagando depois.
- Editar ou excluir: o app pergunta "só esta parcela ou esta e as próximas". As parcelas já confirmadas fora do cartão não mudam.

➡️ Tudo como descrito. O ponto que mais merece sua atenção é o termômetro contar o total. A alternativa é contar só a parcela do mês, o que deixa o termômetro mais "leve" mas esconde o gasto.

---

❓ Q26 - Parcelamento e recorrência são a mesma coisa?: Os dois geram várias linhas a partir de uma regra.
- (a) São conceitos separados. Parcelamento = grupo_id, fixo, criado no app. Recorrência = recorrencia_id, regra editável, guardada na aba Recorrentes.
- (b) Um conceito só, uma "série" com o modo parcelado (total ÷ N) ou recorrente (valor fixo, sem fim ou até uma data).

➡️ (a). Comportam-se diferente: uma recorrência é editada "daqui para a frente" e não tem total, enquanto um parcelamento tem um total que precisa fechar. Juntar os dois complica as duas coisas.

---

❓ Q27 - Ordem das fases: O escopo agora é: aba Lançamentos + Cartões + Recorrentes + Previsão + Config, fórmulas novas nos blocos, menu na planilha, script com API, e o app. Proposta:
1. Planilha primeiro (na Planilha Teste): abas novas, fórmulas, menu "Termômetro" (gerar recorrências, migrar o plano, normalizar). Pronto quando a Teste reproduzir os saldos de out/2026 a dez/2027 da planilha real, centavo por centavo, a partir do plano migrado.
2. Virar a planilha real na data de corte e usar só a planilha por 2–4 semanas, com vocês lançando na aba Lançamentos. Isso valida o modelo antes de existir o app. A desvantagem é que lançar pelo celular nessas semanas é tão ruim quanto hoje.
3. API do script (ping, lancar, listar, resumo).
4. App MVP no Android: Primeiro acesso, Hoje (termômetro + "A confirmar") e Lançar (os 4 tipos, à vista ou cartão, parcelas, detecção de previsto). Funciona offline.
5. O resto, como no documento (editar/excluir, Mês, Totais, Ajustes, iOS…).

Variante: inverter, fazendo 3 e 4 antes do 2. Aí a planilha só vira quando o app estiver pronto, e a primeira fase demora mais.

➡️ A ordem proposta (1 → 2 → 3 → 4). O maior risco do projeto passou a ser o modelo da planilha (cartão, previstos, parcelas), não o app. É melhor descobrir os erros do modelo editando linhas à mão do que depurando o app ao mesmo tempo.

planilha teste: 
TESTE Planilha Cruz Ramires - Termômetro (https://docs.google.com/spreadsheets/d/127v4llEbv6GMW-mccwB0abGlpvPpAA3mU0IKwz2GJEE/edit?gid=2073052214#gid=2073052214)

---
