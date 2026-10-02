# Registro de bugs e dificuldades — Angular Native

Um dos objetivos do projeto é testar o Angular Native e ajudar no seu desenvolvimento ([ADR 0001](decisoes/0001-angular-native-e-registro-de-bugs.md)). **Todo** bug, limitação, documentação confusa ou contorno vira uma entrada aqui, no momento em que acontece.

Cada entrada traz um rascunho de issue. Publicar no GitHub do ng-native é decisão do Murilo (é público e em nome dele); quando publicada, anotar o link.

## Template

```markdown
### AAAA-MM-DD — Título curto

- **Versões:** ng-native x.y.z · Angular x.y.z · Expo SDK xx · Android/iOS xx
- **Tipo:** bug | limitação | documentação | DX
- **O que tentei:**
- **O que esperava:**
- **O que aconteceu:** (mensagem de erro exata, se houver)
- **Reprodução mínima:**
- **Contorno adotado:** (e onde no código, com comentário apontando para esta entrada)
- **Issue upstream:** rascunho abaixo | link quando publicada

<details><summary>Rascunho da issue</summary>

**Título:**

**Descrição:**

</details>
```

## Entradas

### 2026-10-02 — Template traz dependência e config que o app não usa

- **Versões:** ng-native 0.3.0 · Angular 22.2.1 · Expo SDK 57 (expo 57.0.26) · Android (ainda sem build nativo)
- **Tipo:** DX
- **O que tentei:** criar o app com `npx create-expo-app@latest mobile --template @ng-native/template` e passar o knip (código e dependências mortas) num monorepo pnpm.
- **O que esperava:** só o necessário para o app de exemplo rodar.
- **O que aconteceu:**
  1. `expo-status-bar` vem em `dependencies`, mas nada importa esse pacote: o `StatusBar` de `@ng-native/device` fala direto com o módulo nativo (o próprio `status-bar.js` diz que não precisa do componente React). O knip acusa dependência não usada.
  2. `app.json` traz `extra.router.root: "src/app"`, que é configuração do expo-router; o template usa `@ng-native/router` (ou nenhum router), então a chave não tem efeito.
  3. `AGENTS.md` e `README.md` só citam `npm`, mesmo quando o projeto é criado com pnpm.
- **Reprodução mínima:** gerar o template e rodar `npx knip`, ou `grep -r expo-status-bar src`.
- **Contorno adotado:** removemos `expo-status-bar` e `extra.router` em `apps/mobile`, e trocamos os comandos do `AGENTS.md` por `pnpm`.
- **Issue upstream:** rascunho abaixo

<details><summary>Rascunho da issue</summary>

**Título:** template: drop unused `expo-status-bar` dependency and expo-router `extra.router` key

**Descrição:**

A fresh app from `@ng-native/template` (0.3.0) ships two things it never uses:

- `expo-status-bar` in `dependencies`. Nothing imports it; `StatusBar` from `@ng-native/device` drives the native module directly (its own source says the React component is not needed). Tools like knip flag it as unused.
- `"extra": { "router": { "root": "src/app" } }` in `app.json`, which is expo-router configuration. The template does not use expo-router.

Small one too: `AGENTS.md` and `README.md` only show `npm` commands; it would help if they said that `pnpm`/`yarn`/`bun` equivalents work, or used `npx expo ...` for the Expo ones.

</details>
