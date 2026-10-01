# Engenharia

Como manter a base de código sustentável. Vale para pessoas e agentes. O CI verifica tudo o que pode ser verificado; o resto é revisão de PR.

## 1. Ferramentas

| Ferramenta | Papel | Onde roda |
|---|---|---|
| **Biome** | Lint + formatação de TS/JS/JSON. Um `biome.json` na raiz. Sem ESLint/Prettier. | editor, pre-commit, CI (`biome ci`) |
| **TypeScript** 6.0.x | Fixado em 6.0 porque o Angular 22 exige `>=6.0 <6.1`; uma versão só no monorepo. `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`. `tsconfig.base.json` na raiz, estendido por pacote. | editor, pre-push, CI |
| **dependency-cruiser** | Garante as fronteiras de camada (seção 2). | CI |
| **jscpd** | Detecta duplicação de código (limite inicial: 1% por pacote, blocos ≥ 8 linhas). | CI |
| **knip** | Exports, arquivos e dependências não usados. | CI |
| **Vitest** | Testes unitários. Cobertura mínima de 90% de linhas em `packages/dominio`. | CI |
| **lefthook** | Pre-commit: `biome check --write` nos arquivos staged. Pre-push: typecheck e testes afetados. | local |
| **commitlint** | Conventional Commits. | commit-msg, CI |

Biome cobre os templates do Angular só parcialmente. Se o template do Angular Native trouxer outra ferramenta de lint, ela fica restrita a `apps/mobile` e a decisão vira ADR; dificuldade com o template vai para `docs/ng-native-feedback.md`.

## 2. Arquitetura em camadas

```
packages/dominio   ← não importa nada (nem zod, nem framework, nem Apps Script)
packages/contract  ← importa dominio, zod
apps/script        ← importa dominio, contract; só aqui existe SpreadsheetApp
apps/mobile
  ui/              ← importa aplicacao (e componentes)
  aplicacao/       ← casos de uso; importa dominio, contract, portas
  infra/           ← SQLite, SecureStore, RemoteApi; implementa as portas
```

Regras (verificadas pelo dependency-cruiser):

- `dominio` é puro: sem I/O, sem `Date.now()` implícito (o "hoje" entra por parâmetro), sem framework.
- `aplicacao` não importa `ui` nem `infra`; depende de interfaces (portas) como `LancamentosRepository`.
- Nada importa de dentro de outro app (`apps/*` não se importam entre si).
- Sem ciclos.

## 3. Uma regra, um lugar

Duplicação de **regra de negócio** é bug esperando acontecer: app e script calculando parcela ou ciclo de fatura de jeitos diferentes geram dinheiro errado na planilha.

- Toda regra que app e script precisam (centavos, datas, parcelas, ciclo de fatura, recorrência, hash, validação) vive em `packages/dominio` ou `packages/contract`.
- Antes de escrever uma função, procurar se ela já existe. Se existir parecida, estender, não copiar.
- Fórmulas da planilha são geradas por código (funções em `apps/script` que montam a string), nunca copiadas à mão entre blocos.
- Constantes de domínio (listas de categorias, tipos, cores) têm uma fonte só e são importadas.

## 4. Estilo de código

- **Módulos profundos:** interface pequena, implementação escondida. Exportar só o necessário (knip ajuda).
- **Funções puras** sempre que possível; efeitos nas bordas (infra, script).
- **Tipos que impedem erro:** `Centavos` e `DataISO` como tipos marcados (branded); uniões discriminadas para `tipo`, `meio`, `status`. Nada de `any`; `unknown` + validação nas bordas.
- **Erros:** nas bordas (API, planilha, SQLite) usar resultado tipado (`{ ok: true } | { ok: false }`), não exceção solta. Dentro do domínio, entrada inválida é impossível por tipo.
- **Nomes:** domínio em português conforme `CONTEXT.md`; termos técnicos genéricos podem ficar em inglês (`repository`, `queue`). Nunca dois nomes para a mesma coisa.
- **Comentários** explicam o porquê, não o quê. Regra de negócio não óbvia cita a seção do `PROJECT.md` ou o ADR.
- Arquivos pequenos e coesos; um conceito por arquivo.

## 5. Testes

- Dinheiro, datas, parcelas, ciclo de fatura, recorrências e sincronização: testes antes ou junto com o código (TDD quando a regra é nova).
- Casos obrigatórios: virada de mês/ano, dia 31 em mês curto, fevereiro bissexto, compra no dia do fechamento, sobra de centavos em parcelas, reenvio idempotente, conflito por hash.
- `apps/script`: separar I/O (fina) da lógica; testar a lógica com uma planilha falsa em memória.
- Testes descrevem comportamento em português de negócio (`'compra no dia 24 cai na fatura seguinte'`).

## 6. Documentação

| O quê | Onde | Quando atualizar |
|---|---|---|
| Visão, modelo, contrato, roteiro | `PROJECT.md` | no mesmo PR que muda qualquer um deles |
| Termos do domínio | `CONTEXT.md` | no PR que introduz o termo |
| Decisões com alternativas descartadas | `docs/decisoes/NNNN-titulo.md` (template abaixo) | antes ou junto com a implementação |
| Bugs e dificuldades do Angular Native | `docs/ng-native-feedback.md` | assim que acontecer |
| Como rodar, publicar, gerar APK | `README.md` | quando o processo mudar |

Template de ADR:

```markdown
# NNNN — Título

- Status: aceita | substituída por NNNN
- Data: AAAA-MM-DD

## Contexto
## Decisão
## Alternativas consideradas
## Consequências
```

## 7. Git e PRs

- Branch por mudança; PR mesmo trabalhando sozinho; squash merge.
- Conventional Commits (`feat(dominio): …`, `fix(script): …`), escopos = pacotes.
- PR pequeno e com um propósito. Checklist no template de PR:
  - [ ] CI verde (Biome, typecheck, testes, dependency-cruiser, jscpd, knip)
  - [ ] `PROJECT.md` / `CONTEXT.md` / ADR atualizados se aplicável
  - [ ] Nada de segredo, token ou URL de produção no diff
  - [ ] Mudança de contrato respeita compatibilidade (atual + anterior)
  - [ ] Dificuldade com ng-native registrada
