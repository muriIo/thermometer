❓ Q10 - Uma lista de categorias ou duas?: Você mandou uma lista única que mistura gastos (Delivery, Pets, Docinho pós almoço…) e receitas (Salário, Investimentos, Outras receitas, Empréstimos).
- (a) Uma lista só, válida para qualquer tipo.
- (b) Duas listas: Gastos (Alimentação … Viagem) e Receitas (Salário, Investimentos, Outras receitas, Empréstimos). "Empréstimos" e "Outros" aparecem nas duas.

➡️ (b). A faixa de categorias da tela Lançar fica curta, e o gráfico "Por categoria" (Gastos / Entradas) já pede essa divisão. As categorias novas também vão precisar de cor e ícone, que eu proponho seguindo a paleta do design.

---

❓ Q11 - Como o plano (o futuro) é guardado: Escolher (c) na Q6 significa que o plano sai das células. Há dois jeitos de guardá-lo:
- (a) Regras: uma aba Recorrentes (descrição, tipo, valor, dia, de/até ou parcelas). A fórmula de cada dia calcula o previsto a partir das regras e troca pelo real quando ele é lançado. O problema é decidir qual lançamento "baixa" qual previsto, e isso fica muito difícil de fazer em fórmula de planilha.
- (b) Linhas de verdade: o futuro também fica na aba Lançamentos, com uma coluna status = previsto | confirmado. Uma recorrência é só um gerador: o app ou um menu do script cria as linhas até dez/ano seguinte, e "Receita 5/8" vira 8 linhas. Pagar = marcar confirmado, ajustando o valor se mudou (é o ✅ de hoje). A fórmula soma todas as linhas não excluídas do dia, então o saldo projetado continua funcionando como hoje. Editar o plano na planilha é editar linhas.

➡️ (b). As fórmulas continuam simples (só um SOMASES), a planilha e o app editam a mesma coisa, e o comportamento é igual ao de hoje. Pergunta junto: um previsto que vence e não é confirmado continua contando no saldo, como acontece hoje com as células pré-preenchidas? Eu diria que sim, e o app mostra "a confirmar".

---

❓ Q12 - Previsão do Diário: Hoje o Diário futuro é um valor fixo por dia (R$ 30, depois R$ 40). Gerar uma linha previsto por dia daria 365 linhas por ano, só de previsão.
- (a) Uma aba Previsão com mês → valor/dia, editável na planilha e no app. Fórmula do Diário: dia > hoje → previsão; dia ≤ hoje → soma real.
- (b) Linhas previsto diárias, como o resto do plano.

➡️ (a). O termômetro compara o real de hoje com a previsão desse mesmo mês. O "diário previsto" da tela Ajustes passa a editar essa aba.

---

❓ Q13 - Cartão: fatos e regra da coluna Diário:

Fatos que só você sabe: quantos cartões vocês têm, quais são, e o dia de fechamento e de vencimento de cada um. Existe compra parcelada no cartão? "Receita x/8" parece ser uma.

Decisão: uma compra de R$ 8 no cartão, feita hoje, entra em qual lugar do bloco do mês?
- (a) Não entra no Diário de hoje. Ela compõe a Saída "Fatura X" no dia do vencimento. A planilha mostra o caixa (o saldo só cai quando o dinheiro sai), e o termômetro do app mostra o consumo (à vista + cartão) do dia.
- (b) Entra no Diário de hoje, e a fatura soma só o que não é Diário. O saldo cai antes do dinheiro sair de fato.

➡️ (a). É o que você descreveu ("atribuído à fatura"). Isso tem uma consequência: o "Diário" da planilha e o "Diário de hoje" do app passam a medir coisas diferentes. Nesse caso, a previsão da Q12 vale para o consumo, e não para a coluna Diário. A fatura seria uma fórmula (soma das compras daquele cartão no ciclo) no dia do vencimento, e uma compra parcelada gera N linhas, uma em cada fatura.

---

❓ Q14 - O que "Estorno" significa: Você propôs um 4º tipo. Falta definir o que ele desconta:
- (a) Tipo estorno, valor sempre positivo, com um campo estorna = diario | saida. A fórmula de cada coluna fica soma(tipo) − soma(estornos daquele tipo). Se o meio for cartão, o estorno desconta da fatura.
- (b) Tipo estorno que sempre desconta do Diário.

➡️ (a). A regra "valor sempre positivo" continua valendo. E estornos de verdade como "Estorno Ifood" ou o (-36.6) da fatura cabem nesse modelo, tanto à vista quanto no cartão. Não precisa ser só no Diário nem só no mesmo dia.

---

❓ Q15 - Registro do ng-native: onde e em que formato?
- (a) docs/ng-native-feedback.md, com uma entrada por item: data, versão (ng-native/Expo/Angular), o que tentei, o que esperava, o que aconteceu, contorno, link da issue upstream (se houver).
- (b) O mesmo arquivo, e além disso abrir issues no GitHub do ng-native para cada item reproduzível.

➡️ (a) sempre. Para a i(b), eu deixo a issue redigida e você decide se publica, porque é algo público em seu nome. Pode deixar redigida junto com a opção A.


