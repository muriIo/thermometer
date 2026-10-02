# Termômetro — App de lançamentos integrado à planilha

Documento de referência do projeto. Reúne contexto, arquitetura, modelo de dados, contrato de API, segurança, padrões de engenharia e roteiro. Escrito para ser lido por pessoas e por agentes de código (Claude Code).

**Documentos relacionados**

| Documento | Para quê |
|---|---|
| [`CONTEXT.md`](CONTEXT.md) | Glossário do domínio. Termos usados no código, na planilha e na conversa. |
| [`docs/engenharia.md`](docs/engenharia.md) | Padrões de código, lint (Biome), arquitetura em camadas, duplicação, testes, commits. |
| [`docs/decisoes/`](docs/decisoes/) | ADRs (uma decisão por arquivo). `grilling/` guarda as rodadas de perguntas que originaram as decisões de 2026-10-01. |
| [`docs/ng-native-feedback.md`](docs/ng-native-feedback.md) | Registro obrigatório de bugs e dificuldades com o Angular Native. |

---

## 1. Contexto e objetivo

Murilo e Thays controlam as finanças do casal numa planilha Google baseada na metodologia do Breno (planilhadobreno.com.br). A planilha dá visibilidade e serve de **plano** (contas futuras já projetadas), mas o preenchimento fica para trás porque lançar na planilha pelo celular é lento.

**Objetivo:** um app mobile para lançamentos rápidos ("comprei um salgado → abro o app → lanço em segundos → aparece na planilha"), com integração forte nos dois sentidos. **Planilha e app coexistem: tudo pode ser feito nos dois.**

**Princípios:**

- Lançar tem que levar ~3 segundos e nunca falhar (funciona offline).
- A planilha é a fonte da verdade. O app é cache + fila de envio.
- Preencher pelo app e pela planilha precisa funcionar ao mesmo tempo.
- O futuro é projeção, não compromisso rígido: datas e valores previstos podem mudar livremente.
- Custo próximo de zero e sem servidor próprio.

**Usuários:** Murilo (iPhone) e Thays (Android). Primeira versão só no Android.

**Objetivo secundário:** testar o Angular Native (alpha). Todo bug ou dificuldade é registrado em `docs/ng-native-feedback.md` ([ADR 0001](docs/decisoes/0001-angular-native-e-registro-de-bugs.md)).

---

## 2. Links

| O quê | Link |
|---|---|
| Design (canvas com todas as telas e o fluxo) | https://claude.ai/artifact/3Q7xqgHZmBTiuavUbzt54a |
| Planilha real ("Planilha Cruz Ramires - Termômetro") | https://docs.google.com/spreadsheets/d/16NNZnx2Ef5JlJhNke1l8HnQ8OqDceGAUa9CsXT_3F3s/edit |
| **Planilha Teste** ("TESTE Planilha Cruz Ramires - Termômetro") | https://docs.google.com/spreadsheets/d/127v4llEbv6GMW-mccwB0abGlpvPpAA3mU0IKwz2GJEE/edit |
| Angular Native (site e docs) | https://ng-native.com/ |
| Angular Native — guia de início | https://ng-native.com/guide/getting-started |
| Angular Native — docs para agentes de IA | https://ng-native.com/guide/ai-assistants (`llms.txt`) |
| Angular Native — GitHub | https://github.com/ng-native/ng-native |
| Metodologia de referência | https://planilhadobreno.com.br/ |

> **Nota para agentes:** o link do design é um artefato privado do claude.ai. A seção 10 descreve as telas em texto. **Nunca** escreva na planilha real; desenvolvimento e testes usam só a Planilha Teste.

---

## 3. A planilha atual (inspecionada em 2026-10-01)

ID: `16NNZnx2Ef5JlJhNke1l8HnQ8OqDceGAUa9CsXT_3F3s`. Dono: murilomecr@gmail.com. Abas: `2026`, `2027`, `Economia`. Sem intervalos nomeados, validação de dados ou proteção.

### 3.1 Blocos mensais (abas `2026` e `2027`)

Um bloco de 5 colunas por mês, separados por uma coluna vazia:

| Mês | Colunas | Mês | Colunas |
|---|---|---|---|
| Jan | A:E | Jul | AK:AO |
| Fev | G:K | Ago | AQ:AU |
| Mar | M:Q | Set | AW:BA |
| Abr | S:W | Out | BC:BG |
| Mai | Y:AC | Nov | BI:BM |
| Jun | AE:AI | Dez | BO:BS |

Colunas do bloco: **Data** · **Entrada** · **Saída** · **Diário** · **Saldo**.

- Linha 1: nome do mês (mesclada). Linha 2: cabeçalhos. Painéis congelados em A3.
- **Linhas 3–33: dias 1 a 31 em todos os meses**, inclusive os de 30 dias e fevereiro. `Data` é número (1–31), não data.
- Linhas 34–36 vazias. Linha 37: rótulos ENTRADAS / SAÍDAS / DIÁRIO. **Linha 38: totais** (`=SUM(B3:B33)` etc.). Linha 40–41: "Saída Total" `=C38+D38`. Linhas 43–44: "Performance" `=B38-D41`.
- Formatação condicional de cores no Saldo (amarelo 0–1000, verde-claro 1000–2000, verde >2000, vermelho-claro 0 a −499,99, vermelho < −500).

### 3.2 Saldo

Saldo corrido único, de 01/01/2026 a 31/12/2027, sem saldo inicial:

- 2026 Jan dia 1 (`E3`): `=(B3)-(C3+D3)`.
- Demais dias: `=(saldo anterior)+(Entrada)-(Saída+Diário)`.
- Dia 1 de cada mês usa a linha 33 (dia 31) do bloco anterior. 2027 Jan dia 1: `='2026'!BS33+(B3)-(C3+D3)`.

**O Saldo não muda com o projeto.** Só Entrada, Saída e Diário passam a ser fórmulas.

### 3.3 Entrada, Saída e Diário hoje

- Valores digitados ou fórmulas de soma literais (`=1800+120+250`), sem referência a outras células.
- **Notas (comentários) listam cada parcela da soma**, uma por linha, na mesma ordem ("Aluguel / Internet / Energia"). ~580 notas.
- O futuro é um **plano**: contas fixas, salários e parcelas ("Receita 5/8", "Gambiarra 06/10") pré-preenchidos até dez/2027. ✅ na nota marca o que já foi pago.
- O **dia 31 é usado como "fim do mês"** até em meses de 30 dias (salário da Thays, assinaturas).
- Há valores negativos dentro de Saídas (estornos) e rendimentos diários pequenos em Entrada.
- Diário futuro: valor fixo por dia (R$ 30 ou R$ 40, conforme o mês).
- A soma da fatura do cartão aparece como uma Saída grande no dia 2.

### 3.4 Aba `Economia`

Por mês: Entradas (`='2026'!B38`…), Economia (fixo 0), % (`=D/C`). **Os rótulos de ano estão trocados** (bloco "2025" lê a aba 2026; "2026" lê 2027). Fora do escopo do MVP; o casal corrige os rótulos à mão quando quiser.

---

## 4. Arquitetura

```
┌──────────────────────┐   HTTPS POST (JSON)   ┌───────────────────────────┐
│ App Android          │ ────────────────────▶ │ Google Apps Script        │
│ Angular Native+Expo  │ ◀──────────────────── │ Web App + menu da planilha│
│                      │                       │ (preso à planilha)        │
│ SQLite: cache + fila │                       └─────────────┬─────────────┘
│ SecureStore: token   │                                     │ lê/escreve
└──────────┬───────────┘                                     ▼
           │                                  ┌──────────────────────────────┐
           │  ambos importam                  │ Planilha Google              │
           ▼                                  │  Lançamentos (fonte da       │
┌──────────────────────┐                      │   verdade, 1 linha por item) │
│ packages/dominio     │                      │  Cartões · Faturas ·         │
│ (regras puras: $,    │                      │  Recorrentes · Previsão ·    │
│ datas, parcelas,     │                      │  Config                      │
│ ciclo de fatura,     │                      │  2026/2027: Entrada/Saída/   │
│ hash)                │                      │   Diário = fórmulas SOMASES  │
│ packages/contract    │                      │   Saldo = fórmula original   │
└──────────────────────┘                      └──────────────────────────────┘
```

**Decisões centrais:**

1. **Aba `Lançamentos`** com uma linha por item, inclusive o futuro (linhas `previsto`). Os blocos mensais somam essa aba a partir da data de corte. O layout que o casal usa não muda. ([ADR 0003](docs/decisoes/0003-status-previsto-confirmado.md))
2. **Planilha antes do app:** o modelo é validado e usado na planilha antes de existir app. ([ADR 0002](docs/decisoes/0002-planilha-antes-do-app.md))
3. **Apps Script, não Sheets API:** sem projeto no Google Cloud, sem OAuth no app, sem servidor, grátis. Latência de 1–3 s é aceitável porque o app grava localmente primeiro.
4. **Regras de negócio vivem uma única vez**, em `packages/dominio`, e são importadas pelo app e pelo script (ver `docs/engenharia.md`).
5. **Saldo exibido no app é lido da planilha**, nunca recalculado. ([ADR 0007](docs/decisoes/0007-saldo-lido-da-planilha.md))

---

## 5. Modelo de dados

Termos definidos em [`CONTEXT.md`](CONTEXT.md). O script lê e escreve **pelo nome do cabeçalho, nunca pela posição**. Colunas novas são acrescentadas no fim. **Colunas calculadas (marcadas com ƒ) são `ARRAYFORMULA` no cabeçalho, protegidas; o script nunca escreve nelas** (escrever a linha inteira com `setValues` quebraria a fórmula).

### 5.1 Aba `Lançamentos`

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | texto | UUID gerado no celular (ou pelo script para linhas manuais). Chave de idempotência. |
| `data` | data | **Dia do consumo/compra.** Para parcelas no cartão, todas têm a data da compra. Para parcelas à vista, a data de cada parcela. |
| `valor` | número (R$) | Sempre positivo. Reais na planilha; centavos no código. |
| `tipo` | texto | `entrada` \| `saida` \| `diario` \| `estorno` |
| `estorna` | texto | Só para `estorno`: `diario` \| `saida`. |
| `categoria` | texto | Lista do tipo (5.3). Opcional. |
| `descricao` | texto | Opcional, máx. 80 caracteres. Texto puro. |
| `quem` | texto | Quem gastou/recebeu: `Murilo` \| `Thays` \| `Nós dois`. Escolhido no app; padrão = o dono do token. |
| `registrado_por` | texto | Derivado do token no servidor, nunca do payload. Vazio em linhas manuais. |
| `meio` | texto | `avista` \| `cartao`. |
| `cartao` | texto | `id` da aba Cartões, quando `meio = cartao`. |
| `status` | texto | `previsto` \| `confirmado`. Lista suspensa. É o ✅ de antes. |
| `grupo_id` | texto | Parcelamento: igual em todas as parcelas. |
| `parcela_n` | número | 1..N. |
| `parcelas` | número | N. Vazio ou 1 = à vista em uma vez. |
| `recorrencia_id` | texto | Linha gerada por uma regra da aba Recorrentes. |
| `origem` | texto | `app` \| `planilha` \| `recorrencia` \| `migracao` |
| `criado_em` | data/hora | Preenchido pelo script. |
| `atualizado_em` | data/hora | Preenchido pelo script. Informativo; conflito usa hash (6.4). |
| `excluido` | booleano | Exclusão lógica. Fórmulas ignoram `TRUE`. |
| ƒ `fatura_id` | texto | Cartão: `<cartao>-<AAAA-MM>` do mês em que a fatura **fecha**, considerando a parcela. Compra no dia do fechamento ou depois cai na fatura seguinte. |
| ƒ `data_caixa` | data | Dia em que o dinheiro sai/entra. À vista = `data`. Cartão = data efetiva da fatura (`Faturas!data_efetiva`). |

Linhas digitadas à mão podem vir sem `id`/`origem`; o script atribui na primeira leitura, dentro do lock. As colunas ƒ funcionam para linhas manuais sem nenhum passo extra.

### 5.2 Abas auxiliares

**`Cartões`** — editada na planilha; leitura no app.

| `id` | `nome` | `dono` | `fechamento` | `vencimento` | `limite` | `ativo` |
|---|---|---|---|---|---|---|
| `INTER` | Cartão Murilo (Inter) | Murilo | 24 | 1 | 6600 | TRUE |

**`Faturas`** — uma linha por cartão por ciclo, gerada pelo menu até o horizonte (dez do ano seguinte).

| Coluna | Observação |
|---|---|
| `id` | `<cartao>-<AAAA-MM>` (mês do fechamento). |
| `cartao`, `fecha_em`, `vence_em` | Datas do ciclo. `fecha_em` = dia `fechamento` do mês do `id`; `vence_em` = dia `vencimento` do mesmo mês, ou do mês seguinte se `vencimento ≤ fechamento` (Inter: fecha 24/10, vence 01/11). Dia inexistente = último dia do mês. |
| `pago_em` | Vazio = não paga. **Data livre**: pagar no dia 25 ou no dia 1, tanto faz. Pagamento é sempre do total, numa data só. |
| ƒ `data_efetiva` | `pago_em`, ou `vence_em` se vazio. |
| ƒ `total` | Soma das compras não excluídas da fatura − estornos no cartão. |
| ƒ `status` | `aberta` \| `fechada` \| `paga`. |

Fatura real diferente da soma (juros, anuidade, item não lançado): lançar um **"Ajuste de fatura"** (Saída no cartão; se negativo, Estorno no cartão). Pagamento parcial raro: ajuste negativo nesta fatura e positivo na próxima.

**`Recorrentes`** — regras que geram linhas `previsto` ([ADR 0005](docs/decisoes/0005-parcelamento-e-recorrencia-separados.md)).

| Coluna | Observação |
|---|---|
| `id`, `descricao`, `tipo`, `estorna`, `valor`, `categoria`, `quem`, `meio`, `cartao` | Como em Lançamentos. |
| `dia` | 1–31. Dia que não existe no mês = último dia do mês. |
| `inicio`, `fim` | `fim` vazio = sem fim (até o horizonte). |
| `ativo` | Vazio conta como ativa; só `FALSE` desliga. Regra inválida é ignorada com aviso. |

Editar uma regra "daqui para a frente" regenera só as linhas **futuras e ainda `previsto`** daquela regra. Linhas confirmadas nunca mudam. Detalhes (`planejarRecorrencia` em `packages/dominio`):

- Uma ocorrência por mês por regra; a linha existente é casada pelo **mês**, então mudar o `dia` atualiza a linha mantendo o `id`.
- "Futura" = data a partir de hoje, inclusive. Mês com linha confirmada, previsto vencido ("a confirmar") ou cuja ocorrência já passou não muda.
- Previsto futuro num mês que a regra não cobre mais (`fim` antecipado, `ativo = FALSE`) recebe `excluido = TRUE`; repetidos no mesmo mês também.
- Rodar de novo sem mudança na regra não altera nada.

No MVP, recorrências são criadas e editadas só pela planilha (menu "Termômetro").

**`Previsão`** — `mes` (AAAA-MM) → `diario_por_dia` (R$). Previsão de **consumo** do Diário. Editável na planilha (e em Ajustes no app, fase 5).

**`Config`** — chave/valor: `valor_maximo` (R$ 20.000), `confirmar_acima_diario` (R$ 2.000), `horizonte` (fim do ano seguinte; gravado pelo menu ao gerar), `data_corte` (um dia 24; a partir dele os blocos viram fórmula).

### 5.3 Categorias

Duas listas, validadas no script, gerenciáveis depois em Ajustes. Cores e ícones são **propostas** a revisar (contraste AA); os ícones seguem nomes do conjunto Lucide.

**Gastos** (Diário, Saída, Estorno):

| Categoria | Cor | Fundo | Ícone |
|---|---|---|---|
| Alimentação | #C2410C | #FCEBDF | `utensils` |
| Assinaturas e serviços | #6D28D9 | #EFE8FC | `receipt` |
| Casa | #0B6B4A | #E1F3EA | `house` |
| Compras | #1D4ED8 | #E8EEFD | `shopping-bag` |
| Cuidados pessoais | #A21CAF | #FAE8FF | `sparkles` |
| Delivery | #DC2626 | #FDE8E8 | `bike` |
| Docinho pós almoço | #B45309 | #FDF0DC | `candy` |
| Família e amigos | #0369A1 | #E0F2FE | `users` |
| Lazer e hobbies | #A16207 | #FBF0D4 | `gamepad-2` |
| Pets | #4D7C0F | #ECF5DC | `paw-print` |
| Saúde | #BE185D | #FBE7F0 | `heart-pulse` |
| Trabalho | #334155 | #E8ECF1 | `briefcase` |
| Transporte | #0F766E | #DDF3F0 | `car` |
| Viagem | #0E7490 | #DDF4F8 | `plane` |
| Empréstimos | #57534E | #EEECEA | `hand-coins` |
| Outros | #5B6070 | #EEEFF2 | `circle-dashed` |

**Receitas** (Entrada): Salário (`wallet`), Investimentos (`trending-up`), Empréstimos (`hand-coins`), Outras receitas (`plus-circle`). Tons de verde a definir com o design.

Descrições recentes lembram a categoria (tocar em "Salgado" já marca Alimentação).

### 5.4 Fórmulas dos blocos (a partir do corte)

Para cada dia `d` do bloco (montado com `DATA(ano; mês; Data)`):

- **Dia inexistente** (31/04, 30/02…): a célula devolve vazio. Sem isso, `DATA(2026;4;31)` vira 01/05 e conta duas vezes.
- **Entrada(d)** = Σ `entrada` com `data_caixa = d`.
- **Saída(d)** = Σ `saida` à vista com `data_caixa = d` − Σ `estorno`/`saida` à vista em `d` + Σ `Faturas!total` com `data_efetiva = d`.
- **Diário(d)**:
  - `d > HOJE()`: `Previsão` do mês + Σ `diario` à vista já existentes em `d` (ex.: parcelas à vista previstas).
  - `d ≤ HOJE()`: Σ `diario` à vista com `data_caixa = d` − Σ `estorno`/`diario` à vista em `d`.
- **Saldo**: fórmula original, sem mudança.
- Todas as somas ignoram `excluido = TRUE` e contam `previsto` e `confirmado`. **Um previsto que venceu e não foi confirmado continua contando** (o app o mostra como "a confirmar").
- Compras no cartão (de qualquer tipo) **não** entram no Diário do dia: entram na fatura. O termômetro do app mede consumo; a planilha mede caixa ([ADR 0004](docs/decisoes/0004-cartao-e-fatura.md)).
- Antes do corte: valores manuais atuais, intocados.
- As células com fórmula ficam **protegidas com aviso**; o script detecta célula que perdeu a fórmula e avisa no app.
- Fuso: planilha **e** script em `America/Sao_Paulo` (`HOJE()` depende do fuso da planilha).

Exemplo conceitual (pt-BR), Diário de um dia passado:

```
=SE(dia_inexistente; "";
  SE(d > HOJE(); PROCV(mes; Previsão!A:B; 2; 0) + soma_diario_avista(d);
     SOMASES(Lançamentos!valor; Lançamentos!data_caixa; d;
             Lançamentos!tipo; "diario"; Lançamentos!meio; "avista";
             Lançamentos!excluido; FALSO)
   - SOMASES(Lançamentos!valor; Lançamentos!data_caixa; d;
             Lançamentos!tipo; "estorno"; Lançamentos!estorna; "diario";
             Lançamentos!meio; "avista"; Lançamentos!excluido; FALSO)))
```

### 5.5 Parcelamento

Lança-se o **total** e o número de parcelas; a função de domínio gera N linhas:

- Mesmo `grupo_id`; `parcela_n` 1..N. Divisão em centavos, sobra na 1ª parcela (R$ 100 em 3× = 33,34 + 33,33 + 33,33).
- **Cartão:** todas com a data da compra; ƒ `fatura_id` desloca a parcela k para a k-ésima fatura. Todas nascem `confirmado`.
- **À vista/pix:** parcela k em `data + (k−1) meses` (dia inexistente → último dia do mês). A 1ª nasce `confirmado`; as demais, `previsto`.
- **Termômetro:** conta o **total** no dia da compra.
- Editar/excluir: "só esta parcela" ou "esta e as próximas". Parcelas à vista já confirmadas não mudam.
- Qualquer tipo pode ser parcelado.

### 5.6 Dinheiro e datas (regras invioláveis)

- **Dinheiro:** inteiros em **centavos** em todo o código (tipo `Centavos`). Conversão para reais só na leitura/escrita da planilha (`Math.round`) e na formatação de tela.
- **Datas:** string `YYYY-MM-DD` (tipo `DataISO`) em todo o código e no contrato. Nunca `Date` com horário.
- **Fuso:** `America/Sao_Paulo` no manifest do script e nas configurações da planilha.

---

## 6. Contrato de API (app ↔ Apps Script)

### 6.1 Regras gerais

- **Um endpoint**, sempre **POST**, token no corpo (o Apps Script não expõe cabeçalhos; token em URL vai parar em logs).
- Corpo JSON. O Web App responde com redirect 302 para `script.googleusercontent.com`; o `fetch` segue sozinho.

```ts
// packages/contract
export type ApiRequest<A extends Action = Action> = {
  v: number;            // versão do contrato, começa em 1
  token: string;
  action: A;
  payload: PayloadOf<A>;
};

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string } };

export type ErrorCode =
  | 'UNAUTHORIZED' | 'INVALID_PAYLOAD' | 'NOT_FOUND'
  | 'CONFLICT' | 'UNSUPPORTED_VERSION' | 'INTERNAL';
```

### 6.2 Ações

| Ação | Payload | Resposta | Fase |
|---|---|---|---|
| `ping` | — | versão do script, hora do servidor, **nome do dono do token** | 3 |
| `referencias` | — | categorias, cartões, previsão do mês, config (limites) | 3 |
| `lancar` | `{ linhas: LinhaNova[] }` (1 linha, ou N parcelas do mesmo `grupo_id`) | linhas salvas. **Idempotente por `id`**: o que já existe volta sem duplicar. Tudo dentro de um lock. | 3 |
| `editar` | `{ id, versaoVista, ...campos }` (inclui confirmar previsto: `status`, valor, data) | linha atualizada; `CONFLICT` se o hash atual ≠ `versaoVista` | 3 |
| `excluir` | `{ id, versaoVista, escopo: 'so_esta' \| 'esta_e_proximas' }` | marca `excluido = TRUE` | 3 |
| `listar` | `{ de, ate }` (`YYYY-MM-DD`) | lançamentos não excluídos no intervalo, cada um com `versao` (hash) | 3 |
| `resumo` | `{ data }` | saldo do dia e menor saldo do mês (dia) **lidos das células de Saldo**; Diário (caixa) do dia; consumo do dia; previsão; totais do mês por tipo e categoria; alerta de célula sem fórmula | 3 |

`LinhaNova`: `{ id, data, valorCentavos, tipo, estorna?, categoria?, descricao?, quem, meio, cartao?, status, grupoId?, parcelaN?, parcelas? }`. As parcelas são geradas no app pela mesma função de domínio que o menu da planilha usa.

### 6.3 Compatibilidade

- O script aceita a versão atual e a anterior do contrato.
- Campos novos são opcionais. Remover ou renomear campo exige nova versão `v`.
- Tipos em `packages/contract`; schemas zod validam no script.

### 6.4 Conflito por hash

`versao` = hash dos campos de negócio da linha (função em `packages/dominio`). O app guarda a `versao` que viu e a envia em `editar`/`excluir`; o script recalcula sobre a linha atual. Detecta qualquer edição, inclusive manual na planilha, sem depender de gatilho `onEdit` ([ADR 0006](docs/decisoes/0006-conflito-por-hash.md)).

---

## 7. Apps Script

- **TypeScript**, empacotado (esbuild) em um único arquivo e enviado com **`clasp push`**. Código no Git.
- `/** @OnlyCurrentDoc */` no topo.
- **Web App:** executar como o dono, acesso "qualquer pessoa" (a autenticação é o token).
- **Menu "Termômetro"** na planilha:
  - **Preparar abas:** cria as abas/colunas que faltam (nunca remove nem reordena) e regrava as fórmulas ƒ, protegidas com aviso.
  - **Gerar recorrências e faturas** até o horizonte (faturas: do mês atual até a que recebe compras do último dia do horizonte).
  - **Aplicar fórmulas a partir do corte** (`Config.data_corte`): Entrada/Saída/Diário de cada dia viram fórmula; dia inexistente fica vazio.
  - **Verificar fórmulas:** células ƒ e dos blocos que perderam ou mudaram a fórmula, e todo `fatura_id` comparado com `mesDaFatura` do domínio.
  - **Criar aba do próximo ano:** copia o layout do último ano sem valores nem notas, liga o Saldo de 1º/jan ao de 31/dez anterior, aplica fórmulas e estende recorrências e faturas. A geração vai até o horizonte ou até o fim do último ano com aba, o que vier depois.
  - **Migração** (seção 9): registrar saldos atuais (aba `Validação`) · gerar aba `Migração` · importar aba `Migração` · relatório de validação.
- **Trava da planilha real:** os comandos que escrevem recusam a planilha real enquanto a propriedade do script `PERMITIR_PLANILHA_REAL` não for `sim` (criada só na virada da Fase 2).
- **Fórmulas:** geradas por código em sintaxe en-US e traduzidas no separador ao gravar: `setFormula` interpreta na localidade da planilha (em pt-BR, `=SUM(1,2)` vira 1,2; nomes de função em inglês são aceitos). Usam `XLOOKUP`, `LET` e `MAP`; colunas referenciadas pelo cabeçalho atual. Excluído = critério `"<>TRUE"`, para linhas manuais com `excluido` vazio contarem.
- **Tokens:** um por pessoa, em Propriedades do Script (`TOKENS` = `{ "<token>": "Murilo", "<token>": "Thays" }`). Nunca no código. Comparação em tempo constante. Revogar = remover a entrada.
- **Concorrência:** `LockService.getScriptLock()` em toda escrita e na atribuição de `id` a linhas manuais.
- **Validação:** valor inteiro > 0 e ≤ `Config.valor_maximo`; listas fechadas para `tipo`, `estorna`, `categoria`, `meio`, `cartao`, `quem`, `status`; data dentro de ±1 ano (parcelas e recorrências podem ir até o horizonte); descrição ≤ 80.
- **Injeção de fórmula:** texto vindo do app que comece com `=`, `+`, `-`, `@` é gravado como texto puro.
- **Leitura por cabeçalho**; **nunca escrever em colunas ƒ**.
- **Lógica pura em `packages/dominio`**; o script só faz I/O com `SpreadsheetApp`.
- **Deploy:** um único deployment por ambiente, com URL estável. A cada mudança: `clasp push` → nova versão → `clasp deploy -i <deploymentId>`. Esquecer isso deixa a URL servindo código antigo.
- **Backup:** gatilho semanal copiando a planilha para "Backups Termômetro", mantendo as últimas N cópias.
- **Logs:** `console.error` (aparecem em *Execuções*).

---

## 8. App mobile

### 8.1 Stack

- **Angular Native** (Angular 22 + Expo SDK 57 no momento da escrita; **alpha** — fixar versões exatas). Criação:
  ```
  npx create-expo-app@latest mobile --template @ng-native/template
  ```
  Ler o `AGENTS.md` gerado e o `llms.txt` das docs antes de escrever código. Verificar APIs atuais em vez de supor.
- Módulos Expo: **SQLite** (cache e fila), **Secure storage** (token), **Network** (online/offline como signal), **Haptics**, **EAS Update**.
- **Toda limitação ou bug encontrado vai para `docs/ng-native-feedback.md`** com rascunho de issue. Publicar a issue upstream é decisão do Murilo.

### 8.2 Camadas

```
UI (componentes Angular Native)
  └─ serviços de aplicação (casos de uso: lançar, confirmar previsto, sincronizar)
       ├─ packages/dominio (TS puro: centavos, datas, parcelas, ciclo de fatura, hash, sugestão de previsto)
       └─ LancamentosRepository (interface)
            ├─ LocalStore (SQLite: cache + fila)
            └─ RemoteApi (Apps Script)
```

Regra: domínio e casos de uso não importam nada do framework de UI. A regra é verificada no CI (ver `docs/engenharia.md`).

### 8.3 Banco local (SQLite)

- `lancamentos`: espelho da aba (centavos), com `versao` (hash) e `sync_status` (`synced` | `pending` | `error`).
- `fila`: operações pendentes (`lancar` | `editar` | `excluir`), payload, tentativas, último erro, criado_em.
- `referencias`: categorias, cartões, previsão, config.
- `meta`: última sincronização, versão do contrato, nome do dono do token, último `resumo`.

### 8.4 Sincronização

1. Ação do usuário grava **primeiro no SQLite**, atualiza a tela (otimista) e enfileira.
2. Um worker envia a fila em ordem quando há rede, com backoff exponencial.
3. `lancar` é idempotente por `id`.
4. Ao abrir e ao voltar ao primeiro plano: `listar` do mês atual (e ±3 dias para previstos) + `resumo` de hoje + `referencias`. **A planilha sempre vence**: o resultado substitui o cache, preservando itens ainda pendentes na fila.
5. Sem rede: saldo = último `resumo` + pendentes, marcado como **"estimado"**.
6. `CONFLICT`: recarregar o item e avisar o usuário.
7. **Desfazer:** se ainda na fila, remove da fila; se já enviado, `excluir`.

### 8.5 Onboarding e token

- Primeiro acesso: informar o token (colar ou QR). Guardar no **Secure storage**. O `ping` devolve o nome do dono; **não há pergunta "quem usa este celular"**.
- O token nunca entra no build. A URL do Web App vem por variável de ambiente do perfil EAS.

---

## 9. Migração

**Data de corte:** o **primeiro dia 24** (logo após o fechamento do Inter) depois que a Fase 1 cumprir o critério de pronto. Meta 24/10/2026; plano B 24/11/2026 ([ADR 0008](docs/decisoes/0008-data-de-corte-dia-24.md)).

1. Backup completo "pré-migração" da planilha real; nunca mexer nele.
2. Tudo é feito primeiro na **Planilha Teste**.
3. Criar abas `Lançamentos`, `Cartões`, `Faturas`, `Recorrentes`, `Previsão`, `Config`.
4. **Plano futuro** (do corte a dez/2027):
   - O **modelo mensal** (Claro, aluguel/internet/energia, salários, contador/DAS, ração, consórcio, assinaturas…) vira **regras em Recorrentes**, criadas à mão e geradas pelo menu.
   - **Itens avulsos** (Praia virada do ano, Despedida, compras parceladas em curso…) passam pelo script: ele lê cada célula futura, separa as parcelas da fórmula, junta com a linha correspondente da nota e escreve na aba **`Migração`** (data, tipo, valor, descrição, categoria sugerida, aviso quando parcelas ≠ linhas da nota). Murilo revisa e corrige ali; um segundo comando importa como `previsto`, `origem = migracao`.
   - Itens do "dia 31" em meses de 30 dias passam para o último dia real.
   - A fatura que vence logo após o corte vira **uma compra no cartão** "Fatura Inter — compras antes do corte" na fatura correspondente; a fatura de novembro recebe `pago_em` = dia 2, como no plano atual.
   - `Previsão` recebe os valores de Diário por mês (R$ 30 / R$ 40).
5. Aplicar as fórmulas (5.4) nos dias a partir do corte e proteger as células com aviso.
6. **Critério de pronto da Fase 1:** o saldo do **fim de cada mês**, de out/2026 a dez/2027, idêntico ao da planilha real centavo por centavo. Diferenças em dias intermediários só podem vir da regra do dia 31; o script gera a lista para conferência.
7. Na data de corte, repetir na planilha real.

**Ordem no menu "Termômetro"** (Planilha Teste):

1. Preparar abas → preencher `Cartões`, `Config.data_corte` e as regras de `Recorrentes`.
2. Migração: registrar saldos atuais (fotografa o Saldo de cada dia a partir do mês do corte na aba `Validação`). **Antes de qualquer fórmula.**
3. Gerar recorrências e faturas.
4. Migração: gerar aba `Migração`. Regras do script:
   - Entrada/Saída: uma linha por parcela da fórmula (`=1800+120+250`), pareada com a linha da nota na mesma ordem; aviso quando as quantidades diferem ou a fórmula não é uma soma simples. Parcela negativa vira Estorno da coluna. ✅ na nota → `confirmado`.
   - Diário: o valor mais comum do mês vira a `Previsão`; o que passa dele num dia vira lançamento `diario`; abaixo dele vem desmarcado (o Diário futuro não tem como descontar).
   - Dia 31 em mês curto (e 29–31 em fevereiro) vai para o último dia real; no Diário, o valor inteiro vira lançamento.
   - Item igual (mês, tipo, valor) a um lançamento de recorrência já gerado vem desmarcado; descrição que aparece em 3+ meses ganha o aviso "virar recorrência?".
5. Revisar a aba `Migração` (desmarcar, corrigir tipo/meio/cartão/categoria; a fatura logo após o corte vira compra no cartão) → Migração: importar (grava o `id` de volta, então reimportar não duplica).
6. Aplicar fórmulas a partir do corte → Verificar fórmulas.
7. Migração: relatório de validação — fim de mês (linha do dia 31 de cada bloco) tem de bater; diferença em dia intermediário só é aceita no último dia real de mês curto (regra do dia 31). Rodar **antes** do dia do corte: depois dele, o Diário de dias passados deixa de usar a Previsão.

---

## 10. Telas (design: https://claude.ai/artifact/3Q7xqgHZmBTiuavUbzt54a)

Identidade: fundo `#F7F7F5`, cartões brancos com borda `#ECECE7`, tinta `#15171C`, texto secundário `#5B6070`. Cores de tipo: Diário `#1D4ED8`, Saída `#B43C0A`, Entrada `#0B6B4A`, Estorno a definir; alerta laranja `#F97316`. Tipografia: Bricolage Grotesque (números e títulos) + Figtree (texto). Navegação inferior: **Hoje · Mês · (+) · Totais · Ajustes**.

| # | Tela | Conteúdo | Fase |
|---|---|---|---|
| 0 | Primeiro acesso | Informar token; planilha conectada; nome vindo do `ping`. | 4 |
| 1 | **Hoje** | Termômetro: **consumo** de hoje (à vista + cartão; parcelado conta o total) vs previsão (barra laranja ao passar); saldo do dia (estimado se offline); menor saldo do mês; **"A confirmar"** (previstos de hoje e vencidos: toque confirma, toque longo ajusta valor/data); lançamentos de hoje; status de sincronização. | 4 |
| 2 | **Lançar** | Tipo (Diário padrão / Saída / Entrada / Estorno + o que estorna); valor; à vista ou cartão; parcelas; categorias do tipo; descrição com recentes; data (hoje); quem (padrão = eu; Murilo / Thays / Nós dois); teclado numérico; confirmação acima do limite. Se parecer com um previsto de ±3 dias: "É o Aluguel previsto para 05/11? Confirmar em vez de criar". | 4 |
| 3 | Lançado | Volta para Hoje com o item marcado "enviando" e toast **Desfazer** (~5 s). | 4 |
| 3b | Sem internet | Aviso de N lançamentos guardados; itens "pendente"; saldo "estimado". | 4 |
| 4 | Mês | Tabela espelhando o bloco (Dia, Entrada, Saída, Diário, Saldo), hoje destacado, saldos baixos em laranja. | 5 |
| 5 | Detalhe do dia | Totais e lançamentos do dia; "Lançar neste dia". | 5 |
| 6 | Editar | Campos do lançamento; "só esta parcela / esta e as próximas"; salvar e excluir. | 5 |
| 7 | Totais | Resultado do mês, entradas, saídas, diário, custo de vida, diário por pessoa (`quem`), diário médio vs previsto. | 5 |
| 7b | Por categoria | Rosca e lista; seletor Gastos / Só diário / Receitas. | 5 |
| 8 | Ajustes | Planilha conectada, sincronização, pendentes, abrir no Sheets; tipo padrão; previsão; diagnóstico (fila, último erro, versões). Depois: recorrências, cartões, "Pagar fatura". | 5+ |

Requisitos de UX: alvos ≥ 44 px; contraste AA; lançar em ≤ 3 toques no caso comum; nada bloqueia esperando rede.

---

## 11. Ambientes

| Ambiente | Planilha | Apps Script | Perfil EAS |
|---|---|---|---|
| Desenvolvimento | Planilha Teste | deployment de teste | `development` |
| Preview | Planilha Teste → depois real | teste → depois produção | `preview` |
| Produção | Planilha real | deployment de produção | `production` |

- **Nunca** testar contra a planilha real. Cada ambiente tem tokens próprios. `eas.json` define `EXPO_PUBLIC_API_URL` por perfil.

---

## 12. Estrutura do repositório

Monorepo privado no GitHub, pnpm workspaces:

```
/
├─ apps/
│  ├─ mobile/            # Angular Native + Expo
│  └─ script/            # Apps Script em TS (clasp, esbuild, appsscript.json)
├─ packages/
│  ├─ dominio/           # regras puras: centavos, datas, parcelas, ciclo de fatura, hash
│  └─ contract/          # tipos e schemas do contrato (request/response, enums)
├─ docs/
│  ├─ engenharia.md      # padrões de código e ferramentas
│  ├─ ng-native-feedback.md
│  └─ decisoes/          # ADRs + grilling/
├─ PROJECT.md            # este documento
├─ CONTEXT.md            # glossário do domínio
├─ CLAUDE.md             # entrada para agentes
├─ biome.json
└─ README.md             # como rodar, publicar o script, gerar APK
```

---

## 13. Versionamento e releases

- **Git:** branches + PRs (mesmo sozinho), Conventional Commits, `CHANGELOG.md`, tags `vX.Y.Z` iguais à versão do app.
- **App:** semver; build incrementado pelo EAS (`autoIncrement`, versão remota).
- **OTA (EAS Update):** JS/templates/estilos por OTA no canal do perfil. Mudanças nativas exigem build novo. `runtimeVersion` impede OTA em binário incompatível.
- **Contrato:** campo `v`; script aceita atual e anterior.
- **Apps Script:** deployments versionados (seção 7).
- **Planilha:** histórico do Google + backup semanal + cópia pré-migração.
- **Dependências:** versões exatas, lockfile commitado, atualização deliberada (especialmente Angular Native).

---

## 14. Segurança (checklist)

- [ ] Token por pessoa nas Propriedades do Script; revogável individualmente.
- [ ] `registrado_por` derivado do token no servidor, nunca do payload.
- [ ] Token no Secure storage; nunca no bundle, no repositório ou em variável de build.
- [ ] Todas as chamadas por POST com token no corpo.
- [ ] `@OnlyCurrentDoc` no script.
- [ ] Validação completa de payload (tipos, limites, listas fechadas, tamanho de texto).
- [ ] Proteção contra injeção de fórmula na escrita.
- [ ] `LockService` em escritas; idempotência por `id`.
- [ ] Exclusão lógica (nunca apagar linhas).
- [ ] Verificação em duas etapas na conta Google dona da planilha e do script.
- [ ] Planilha compartilhada só entre os dois.
- [ ] `.gitignore` cobrindo `.clasprc.json`, `.env*` e credenciais.

---

## 15. Engenharia, testes e CI

Detalhes em [`docs/engenharia.md`](docs/engenharia.md). Resumo:

- **Biome** para lint e formatação (sem ESLint/Prettier). TypeScript `strict`.
- **Fronteiras de camada** verificadas por `dependency-cruiser`; **duplicação** por `jscpd`; **código morto** por `knip`.
- **Testes:** Vitest em `packages/dominio` (foco: dinheiro, datas, parcelas, ciclo de fatura, hash), `packages/contract` (schemas, inclusive versão anterior) e `apps/script` (funções de I/O com planilha falsa). App: `@ng-native/testing` para Lançar e Hoje, unitários da fila de sincronização. E2E com Maestro depois.
- **CI (GitHub Actions)** em todo PR: `biome ci`, typecheck, testes, dependency-cruiser, jscpd, knip.
- Deploy do script e builds EAS disparados manualmente no começo.

---

## 16. Observabilidade

- Tela de diagnóstico em Ajustes: fila, último erro, última sincronização, versões do app e do contrato.
- Erros do script em *Execuções* no editor do Apps Script.
- Alerta de célula sem fórmula no `resumo`.

---

## 17. Distribuição

- **Agora — Android (Thays e testes):** EAS Build perfil `preview` gerando **APK** com distribuição interna. Atualizações por OTA no canal `preview`.
- **Depois — iOS (Murilo):** Apple Developer Program (US$ 99/ano), build EAS, TestFlight. Decisão em aberto.

---

## 18. Roteiro

Cada fase tem critério de pronto. Não avançar sem cumprir.

**Fase 0 — Fundação do repositório**
- Monorepo pnpm, `packages/dominio`, `packages/contract`, `apps/script` com clasp apontando para a Planilha Teste.
- Biome, TypeScript strict, dependency-cruiser, jscpd, knip, lefthook, commitlint, CI, README, `CLAUDE.md`.
- ✅ Pronto quando: CI verde num PR de exemplo, com uma função de domínio testada.

**Fase 1 — Modelo da planilha (Planilha Teste)**
- Abas novas (5.1–5.2), fórmulas dos blocos (5.4), proteções.
- Domínio: centavos, datas, parcelas, ciclo de fatura, geração de recorrências e faturas.
- Menu "Termômetro": gerar recorrências/faturas, migração (gerar/importar), verificar fórmulas, relatório de validação.
- Migração do plano (seção 9).
- ✅ Pronto quando: saldos de fim de mês de out/2026 a dez/2027 idênticos à planilha real, com diferenças diárias explicadas; e um lançamento digitado à mão (à vista, cartão e parcelado) aparece no bloco certo.
- **Status (2026-10-01): cumprido na Planilha Teste**, com corte em 24/10/2026. Dos 465 dias de out/2026 a dez/2027, 457 batem centavo a centavo e 8 diferem só pela regra do dia 31. A única diferença de fim de mês é intencional: a "Receita" (R$ 254,50, parcela 8/8 em jan/2027) foi encerrada em jan/2027, enquanto o plano antigo a repetia até dez/2027. Lançamentos manuais à vista, no cartão e parcelados caíram no bloco certo, e "Verificar fórmulas" passou.

**Fase 2 — Virada da planilha real e uso só pela planilha**
- Backup pré-migração; repetir a Fase 1 na real no primeiro dia 24 após o pronto.
- 2–4 semanas lançando direto na aba Lançamentos.
- ✅ Pronto quando: um ciclo de fatura completo fechado sem divergência e ajustes no modelo registrados.

**Fase 3 — API do Apps Script**
- `ping`, `referencias`, `lancar`, `editar`, `excluir`, `listar`, `resumo`, com validação, tokens, lock, idempotência, hash e proteção de fórmula.
- ✅ Pronto quando: chamadas manuais criam lançamentos (inclusive parcelados) sem duplicar em reenvio, confirmam previsto, detectam conflito após edição manual e rejeitam token e payload inválidos.

**Fase 4 — App MVP (Android)**
- Telas 0, 1, 2, 3, 3b. SQLite com fila offline, sincronização, Secure storage.
- APK `preview` no celular da Thays, apontando para a Planilha Teste; depois para a real.
- ✅ Pronto quando: lançar em modo avião, voltar a rede e o lançamento aparecer uma única vez; e uma semana de uso real sem lançamento perdido ou duplicado.

**Fase 5 — Visão completa**
- Mês, Detalhe do dia, Editar, Totais, Por categoria, Ajustes, diagnóstico; "Pagar fatura"; recorrências e cartões no app.

**Fase 6 — iOS**
- Apple Developer Program, build iOS, TestFlight.

**Fase 7 — Opcionais**
- Backup semanal automático (pode entrar antes), biometria para saldos, comparação entre meses, aba Economia, E2E com Maestro.

---

## 19. Decisões em aberto

- [ ] Assinatura do Apple Developer Program (define o início da Fase 6).
- [ ] Cores definitivas das categorias de receita e do tipo Estorno.
- [ ] Data de corte efetiva (regra decidida: primeiro dia 24 após o pronto da Fase 1; Fase 1 pronta em 2026-10-01 → meta 24/10/2026).

---

## 20. Riscos conhecidos

| Risco | Mitigação |
|---|---|
| Angular Native em alpha | Versões fixas; lógica fora da UI; registro em `ng-native-feedback.md`. |
| Modelo da planilha errado (cartão, previstos, parcelas) | Fase 1 na Teste com critério centavo a centavo; Fase 2 sem app. |
| Fórmulas pesadas (SOMASES × 730 dias × 3 colunas) deixam a planilha lenta | Medir na Fase 1; se preciso, colunas auxiliares ou totais por dia numa aba intermediária. |
| Edição manual quebra fórmula ou coluna ƒ | Proteção com aviso; verificação de fórmulas no menu e no `resumo`. |
| Lançamento duplicado de um previsto | Detecção no Lançar + lista "A confirmar". |
| Esquecer de atualizar o deployment do script | Passo no README e checklist de release. |
| Celular desatualizado chamando contrato antigo | Script aceita versão atual e anterior. |
| Perda de dados na migração | Backup pré-migração, Planilha Teste, revisão na aba Migração, exclusão lógica, backup semanal. |
