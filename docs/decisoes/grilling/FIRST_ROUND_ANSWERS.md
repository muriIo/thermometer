❓ Q1 - App nativo, ou PWA?: Hoje o plano é Angular Native (alpha) + Expo, com APK para ela agora e iOS só na Fase 6, que exige US$ 99/ano. Isso tem uma consequência séria: você, que constrói o app, não vai conseguir usá-lo no seu iPhone até a Fase 6. Metade do casal continua lançando na planilha à mão, e a Fase 4 ("uma semana de uso real") só testa metade do uso.

Opções:
- (a) PWA (Angular comum, instalada na tela inicial). Funciona no iPhone e no Android hoje, de graça e sem loja. Offline com IndexedDB + Service Worker, atualização instantânea sem EAS/OTA, e você usa uma stack estável. Perde: háptico no iOS, Keychain (o token fica no IndexedDB) e um pouco de "cara de nativo". Atenção: o iOS pode apagar os dados de uma PWA sem uso por semanas. Com uso diário, na prática não acontece.
- (b) Expo + React Native (estável, mesmo pipeline de EAS). Continua precisando dos US$ 99 para o iOS.
- (c) Angular Native como no documento. Alpha em cima de alpha, mesmo problema do iOS.

➡️ (c) a idéia é testar o ng-native. Por isso, vamos adotar a postura de SEMPRE registrar bugs, dificuldades num arquivo separado para podermos ajudar o desenvolvimento do ng-native. Sei que poderá ter bugs e limitações, mas esse é a idéia. Vamos de Angular Native. Inicialmente quero testar apenas no Android mesmo mas no futuro verei se compro o assento no apple developer program.

---

❓ Q2 - "Quem" é quem registrou ou quem gastou?: O documento diz que quem vem do token e nunca do payload. Mas a tela Lançar tem um campo "quem", a tela Editar também, e o Primeiro acesso pergunta "Quem usa este celular?". Isso é contraditório, porque o token já identifica a pessoa. E "diário por pessoa" (Totais) só faz sentido se quem for quem gastou. Exemplo: você paga o almoço dela; de quem é?

- (a) quem = quem registrou, derivado do token. Some o seletor do onboarding (o ping devolve o nome) e some o campo nas telas.
- (b) Dois campos: registrado_por (do token, auditoria) e quem (quem gastou, escolhido no app, padrão = você mesmo, com opção "Nós dois").
- (c) Sem quem nenhum.

➡️ (b). A auditoria continua segura via token, e "diário por pessoa" passa a significar alguma coisa. O onboarding perde a pergunta "quem usa este celular".

---

❓ Q3 - Lançamento manual nos blocos depois do corte: A partir do corte, as células Entrada/Saída/Diário passam a ser fórmulas. Se algum de vocês, por hábito, digitar um valor direto no bloco do mês (como faz hoje), a fórmula some sem aviso e daquele dia em diante o app e a planilha divergem.

- (a) Proteger os intervalos de fórmula (Dados → Proteger, só o dono edita ou "mostrar aviso"). Lançamento manual passa a ser só na aba Lançamentos.
- (b) Não proteger e confiar na disciplina.
- (c) Ter uma checagem no script (no resumo ou num gatilho) que detecta célula sem fórmula e avisa no app.

➡️ (a) com "mostrar aviso" + (c) como rede de segurança barata.

---

❓ Q4 - O que significa "Planilha é a fonte da verdade" para lançamentos digitados à mão na aba Lançamentos: O documento admite linhas sem id/origem e diz que o script "atribui id na primeira leitura". Mas atualizado_em só muda quando o script escreve. Se ela corrigir um valor direto na planilha, o CONFLICT do editar não detecta nada, e o app pode sobrescrever a correção dela.

- (a) Gatilho onEdit instalável na aba Lançamentos, que preenche id, origem=planilha e atualizado_em a cada edição manual.
- (b) Edição manual da aba Lançamentos não é suportada; ela existe só para leitura e para casos raros, e se der conflito, que dê.
- (c) Detectar conflito comparando o conteúdo da linha (hash dos campos) em vez de timestamp.

➡️ (c). Não depende de gatilho (o onEdit não dispara em todas as edições, por exemplo colar via API ou editar fora do Sheets). O app manda o hash da versão que viu e o script compara. O id faltante continua sendo atribuído na leitura, dentro do lock.

---

❓ Q5 - Nome dela e categorias de entrada (rápidas, só para fechar):
- Nome no app? - Thays (ela) e Murilo (Eu)
- Categorias de entrada: Alimentação, Assinaturas e serviços, Casa, Compras, Cuidados pessoais, Delivery, Docinho pós almoço, Família e amigos, Lazer e hobbies, Outros, Pets, Saúde, Trabalho, Transporte, Viagem, Empréstimos, Investimentos, Outras receitas, Salário

---

❓ Q6 - Quais colunas viram fórmula?: O documento quer transformar Entrada, Saída e Diário em fórmulas sobre a aba Lançamentos. Mas Entrada e Saída funcionam como plano: contas fixas pré-preenchidas até dez/2027, parcelas contadas, ✅ quando paga. Se virarem SE(dia > HOJE(); previsão; soma), o plano precisa ser recriado em outro lugar. Além disso, no dia de vencimento o valor previsto cai para o que foi lançado (talvez 0), e o saldo dá um salto até alguém lançar o aluguel.

- (a) Só o Diário vira fórmula. Entrada e Saída continuam como estão, um plano editado à mão. O app lança Saída/Entrada pontual numa nova aba e a fórmula da célula vira = valor manual + soma de Lançamentos. Fica complicado.
- (b) Só o Diário vira fórmula. O app só lança Diário (e talvez Saída avulsa); Entrada e Saída continuam 100% manuais.
- (c) As três viram fórmula, e o plano vai para uma aba Recorrentes (regras: dia, valor, descrição, de/até, parcelas). A fórmula soma o real ou o previsto até que um lançamento "baixe" o previsto.

➡️ (c) - a idéia e a planilha  e o app coexistirem. quero poder fazer tudo nos dois. os valores futuros devem ficar nos seus devidos lugares, exatamente como a planilha faz ao contabilizar o futuro somente quando chega.


---

❓ Q7 - Cartão de crédito: A Saída de cerca de 75 parcelas em 24/09 parece uma fatura detalhada. Se a Thays comprar o salgado no cartão e lançar como Diário hoje, e depois a fatura entrar como Saída no vencimento, o salgado é contado duas vezes. Como vocês tratam isso hoje?

- (a) Diário é só o que é pago na hora (pix/débito). Compra no cartão entra só na fatura.
- (b) Tudo entra no dia da compra, e a fatura entra só com o que ainda não foi lançado (a diferença).
- (c) Cada lançamento tem um campo meio (cartão ou à vista); a fatura é derivada no fim do mês.

➡️ (c) - quero poder ter noção de gastos no dia, mas o valor deve ser atribuído á fatura, já que pagaremos só no outro mês (exemplo)

---

❓ Q8 - Dias que não existem (31/04, 30/02): Com o cálculo por data, DATA(2026; 4; 31) vira 01/05, e esse valor seria contado duas vezes (no "31/04" e no 01/05). E o app não deixa escolher 31/04.

- (a) A fórmula devolve vazio quando o dia não existe no mês. O "fim de mês" manual continua possível só nas colunas que ficam manuais (Q6b).
- (b) Proibir valores nesses dias e mover o que já existe para o último dia real.

➡️ (a). É obrigatório nas fórmulas de qualquer forma, e com a Q6(b) só afeta o Diário, que nesses dias tem apenas previsão.

---

❓ Q9 - Valor negativo e histórico: Duas regras do documento batem com o uso real.
- Negativo: o documento diz "valor sempre positivo", mas existem estornos negativos. Permitir negativo, ou estorno vira lançamento do tipo oposto?
- Histórico: as notas + fórmulas de soma permitem importar o histórico de 2026 para a aba Lançamentos (parear as parcelas da fórmula com as linhas da nota). Vale o esforço, ou o histórico fica nas células manuais antes do corte, como o documento propõe?

➡️ Negativo: permitir só no Diário, para estorno do mesmo dia, com descrição obrigatória. Histórico: não importar. As células antes do corte já guardam tudo, e o pareamento nota↔parcela vai ter muitos casos que quebram. Se for válido, podemos criar um lançamento chamado "Estorno" e assim ficamos com "Diário, Saída, Entrada, Estorno".

---
