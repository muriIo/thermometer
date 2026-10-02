# Termômetro

App de lançamentos rápidos integrado à planilha do casal. Visão completa em [`PROJECT.md`](PROJECT.md); padrões de código em [`docs/engenharia.md`](docs/engenharia.md).

## Requisitos

Versões fixas em [`mise.toml`](mise.toml): Node 24.4.1 e pnpm 12.8.1.

```sh
mise trust && mise install   # ou instale as versões acima de outro jeito
pnpm install                 # também instala os hooks do git (lefthook)
```

## Comandos

| Comando | O quê |
|---|---|
| `pnpm verify` | Tudo que o CI roda: lint, typecheck, testes, camadas, duplicação, código morto. |
| `pnpm format` | Formata e corrige com Biome. |
| `pnpm test` | Testes de todos os pacotes. |
| `pnpm --filter @termometro/script build` | Gera `apps/script/dist/` para o Apps Script. |

## Estrutura

| Pasta | O quê |
|---|---|
| `packages/dominio` | Regras puras (centavos, datas, parcelas, faturas…). Não importa nada. |
| `packages/contract` | Contrato app ↔ script (tipos + schemas zod). |
| `apps/script` | Apps Script em TypeScript (Web App + menu da planilha). |
| `apps/mobile` | App Angular Native (a partir da Fase 4). |

## Apps Script

Só a **Planilha Teste** durante o desenvolvimento. Nunca a real.

1. Na Planilha Teste: *Extensões → Apps Script*. Copie o ID do projeto (*Configurações do projeto*).
2. `cp apps/script/.clasp.json.example apps/script/.clasp.json` e cole o ID. (`.clasp.json` não é versionado.)
3. `pnpm --filter @termometro/script exec clasp login` (uma vez por máquina).
4. `pnpm --filter @termometro/script push` — gera o bundle e envia.
5. Em *Configurações do projeto → Propriedades do script*, crie `TOKENS` com `{"<token>": "Murilo", "<token>": "Thays"}`. Gere tokens longos e aleatórios (ex.: `openssl rand -base64 32`).
6. Primeira publicação: *Implantar → Nova implantação → App da Web* (executar como você, acesso: qualquer pessoa). Guarde o ID da implantação.
7. **Toda mudança depois:** `push` e então `pnpm --filter @termometro/script exec clasp deploy -i <idDaImplantacao>`. Sem isso, a URL continua servindo o código antigo.

**Planilha real** (só a partir da virada da Fase 2, ver [`docs/virada-fase-2.md`](docs/virada-fase-2.md)): o projeto Apps Script preso à planilha real tem seu próprio `apps/script/.clasp.real.json` (copie de `.clasp.real.json.example`) e é enviado com `pnpm --filter @termometro/script push:real`. A escrita só é liberada com a propriedade do script `PERMITIR_PLANILHA_REAL` = `sim` naquele projeto.

Teste rápido:

```sh
curl -sL -X POST "$URL_DO_WEB_APP" -H 'Content-Type: application/json' \
  -d '{"v":1,"token":"<token>","action":"ping","payload":null}'
```
