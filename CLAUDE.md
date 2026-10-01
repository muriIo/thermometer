# Termômetro

App de lançamentos (Angular Native + Expo) integrado a uma planilha Google via Apps Script. Documentação em português.

Leia antes de mudar qualquer coisa:

- `PROJECT.md` — visão, modelo de dados, contrato de API, roteiro (a fase atual está na seção 18).
- `CONTEXT.md` — glossário. Use estes termos no código.
- `docs/engenharia.md` — camadas, Biome, regras contra duplicação, testes, commits.
- `docs/decisoes/` — ADRs. Não contrarie uma decisão aceita sem propor um ADR novo.

Regras que não podem ser quebradas:

- **Nunca** escrever na planilha real (`16NNZnx2…`). Desenvolvimento usa só a Planilha Teste (`127v4llE…`).
- Dinheiro em centavos inteiros; datas como `YYYY-MM-DD`.
- Regra de negócio só em `packages/dominio` / `packages/contract`.
- O script nunca escreve em colunas calculadas (ƒ) da aba Lançamentos.
- Todo bug ou dificuldade com o Angular Native vai para `docs/ng-native-feedback.md`, com rascunho de issue. Não publicar issues; o Murilo decide.
- Verificar APIs atuais do Angular Native no `llms.txt` / `AGENTS.md` do template em vez de supor.
