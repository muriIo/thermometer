---

❓ Q13' - Cartões (só fatos): Para cada cartão: nome, de quem é (Murilo, Thays ou dos dois), dia de fechamento e dia de vencimento. Quando há compra parcelada no cartão, vocês lançam o total ou cada parcela? E "Receita x/8" é uma compra no cartão ou outra coisa?

➡️ Vamos criar um cadastro de cartões. Assim podemos identificar a compra no cartão. Lançaremos o total com a quantidade de parcelas, o app deve fazer a conta e replicar a quantidade para a conta fechar. Vamos assumir que QUALQUER lançamento pode ser parcelado.

---

❓ Q16 - Como migrar o plano que já existe: De out/2026 a dez/2027 as células futuras têm fórmulas como =1800+120+250 com a nota "Aluguel / Internet / Energia". Depois do corte, elas viram fórmula e esse conteúdo precisa virar linhas previsto na aba Lançamentos.
- (a) Um script lê cada célula futura, separa as parcelas da fórmula, junta cada uma com a linha cor
- (b) Recriar à mão como recorrências (Q17). O plano de 2027 é quase só um modelo mensal.
- (c) Os dois: o modelo mensal vira recorrência, e só os itens avulsos (Praia virada do ano, Despedida…) passam pelo script.

➡️ (c). As recorrências já ficam prontas para editar daqui para a frente, e o script só cuida do que é irregular. Com a revisão na aba Migração, nenhum valor entra sem você ver.

---
❓ Q17 - Recorrências: onde vivem e como se editam: A Q11(b) gera linhas. Falta decidir o que acontece quando "o aluguel sobe a partir de março".
- (a) Uma aba Recorrentes guarda a regra (descrição, tipo, valor, dia, início, fim ou nº de parcelas, categoria, quem, meio). Cada linha gerada tem um recorrencia_id. Editar a regra "daqui para a frente" regenera só as linhas futuras e ainda previsto; as confirmadas não mudam. "Dia 31" significa o último dia do mês.
- (b) Sem regra guardada: gerar é só copiar linhas, e mudar o valor é editar as linhas uma a uma.

Junto vem o horizonte: até 31/12 do ano seguinte, que é até onde vão as abas de ano. Quando o ano vira, um comando de menu cria a aba do ano novo (2028…) e estende as recorrências.

➡️ (a), com o horizonte acima. No MVP, criar e editar recorrências é só pela planilha, num menu "Termômetro" do script; no app, numa fase posterior.

---

❓ Q18 - Confirmar um previsto sem duplicar: Dia 5 você paga o aluguel e, por hábito, abre o app e lança "Aluguel R$ 1.800". O previsto do aluguel já existe para o dia 5, então ele entra duas vezes no saldo.
- (a) O Hoje mostra uma lista "A confirmar" (previstos de hoje e vencidos). Um toque confirma, e tocar e segurar ajusta o valor ou a data. Na tela Lançar, se a descrição ou a categoria for parecida com um previsto de ±3 dias, o app pergunta "É o Aluguel previsto para 05/11? Confirmar em vez de criar".
- (b) Só a lista "A confirmar", sem detecção na hora de lançar.
- (c) Nada no app; confirmar é só na planilha (coluna status).
mais provável do dia a dia.

Na planilha, status vira uma lista suspensa (previsto/confirmado), que é o ✅ de hoje.

➡️ (a). A detecção é barata (busca por descrição e por data no cache local) e evita o erro mais provável do dia a dia.

---

❓ Q19 - De onde vem o saldo que o app mostra: O resumo precisa do saldo do dia e do menor saldo do mês.
- (a) Ler direto as células de Saldo do bloco do mês, já calculadas pela planilha. O script conhece o layout (mês → colunas, dia → linha).
- (b) O script refaz a conta a partir da aba Lançamentos.

➡️ (a). O saldo depende de valores digitados à mão antes do corte, que não estão em Lançamentos, e assim o app e a planilha mostram sempre o mesmo número. Quando você não tem internet, o app mostra o último saldo recebido mais os pendentes, marcado como "estimado".

---

❓ Q20 - Desfazer: O toast "Desfazer" da tela Lançado aparece depois que o lançamento já foi enviado, ou só antes?
- (a) Ainda na fila: o app tira da fila e nada chega à planilha. Já enviado: o app manda excluir (exclusão lógica). O toast dura uns 5 s nos dois casos.
- (b) Só desfaz se ainda estiver na fila.

➡️ (a). Para você o resultado é o mesmo, e a diferença fica escondida no código.

---

❓ Q21 - Valor máximo: Qual o maior valor aceito por lançamento, como proteção contra um "zero a mais" na digitação? Os valores reais mais altos que vi: salário de R$ 7.671,86, e somas de fatura e lançamentos únicos de R$ 6–7 mil.
- (a) R$ 20.000, fixo.
- (b) Configurável numa aba Config da planilha, começando em R$ 20.000. Acima de um limite menor (ex.: R$ 2.000 no Diário), o app pede uma confirmação em vez de recusar.

➡️ (b).

---

❓ Q22 - Aba Economia: Hoje os anos estão trocados (o bloco "2025" lê a aba 2026) e a coluna Economia está toda zerada.
- (a) O app ignora a aba no MVP. Você corrige os rótulos à mão quando quiser, porque a aba não depende de nada do projeto.
- (b) Calcular Economia a partir de Lançamentos e mostrar em Totais.

➡️ (a). Fica como opcional na Fase 7, como já está no documento.

---
