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

### 2026-10-02 — `SecureStorage` não tem leitura que se possa aguardar

- **Versões:** ng-native 0.3.0 · Angular 22.2.1 · Expo SDK 57 (expo-secure-store 57.0.4)
- **Tipo:** limitação
- **O que tentei:** implementar uma porta `lerToken(): Promise<string | null>` sobre `SecureStorage` (`@ng-native/expo/secure-store`), fora de um template, para o núcleo do app saber se já existe token antes de decidir entre a tela de primeiro acesso e a Hoje.
- **O que esperava:** um `get(key)` que devolve promessa, ou acesso ao `NativeStore` por baixo do `SecureStorage`.
- **O que aconteceu:** `Store` só expõe `signal(key, initial)`, `ready` (signal), `remove` e `flush`. Esperar a leitura exige observar `ready` com `effect`/`toObservable`, o que pede contexto de injeção dentro de uma classe que não é Angular. O `NativeStore` (que tem `get`) existe na tipagem, mas o `SecureStorage` é um `InjectionToken<Store>` sem expor a fonte.
- **Reprodução mínima:** tentar escrever `async function lerToken(store: Store): Promise<string | null>` sem `inject()`.
- **Contorno adotado:** `apps/mobile/src/infra/cofre-seguro.ts` usa `expo-secure-store` direto (`getItemAsync`/`setItemAsync`), recebido por parâmetro em `portas-do-aparelho.ts`. Perde o `MissingModuleError` do ng-native.
- **Issue upstream:** rascunho abaixo

<details><summary>Rascunho da issue</summary>

**Título:** `Store`: add an awaitable read (`get(key): Promise<T | null>`) or expose the `NativeStore`

**Descrição:**

`Store` (behind `Storage` and `SecureStorage`) is great for binding a value to a template, but code outside a component that just needs to read a value once has no clean way to await it. The options today are observing `ready` through `effect`/`toObservable` (which needs an injection context) or relying on `SecureStorage` answering synchronously.

A small `get<T>(key): Promise<T | null>` on `Store` (same JSON parsing and error handling as `signal`) would cover it, or a way to reach the `NativeStore` behind `SecureStorage`. Use case: an offline-first app whose core is framework-free and receives a `TokenStore` port at composition time.

</details>

### 2026-10-02 — Peer `expo-modules-core` do `@ng-native/expo` contradiz a orientação da Expo

- **Versões:** ng-native 0.3.0 (@ng-native/expo) · Expo SDK 57 (expo 57.0.26, expo-modules-core 57.0.20) · pnpm 12.8.1
- **Tipo:** DX | documentação
- **O que tentei:** rodar `npx expo-doctor` antes do primeiro build no EAS, num monorepo pnpm.
- **O que esperava:** nenhum aviso com as dependências que a documentação manda instalar.
- **O que aconteceu:** sem `expo-modules-core` no `package.json`, o doctor diz: "Missing peer dependency: expo-modules-core. Required by: @ng-native/expo … Your app may crash outside of Expo Go". Instalando o pacote, o doctor passa a dizer: "The package "expo-modules-core" should not be installed directly in your project. You should instead use the exported API from the expo package." Não há como passar nos dois.
- **Reprodução mínima:** app do template com `@ng-native/expo` instalado com pnpm; rodar `npx expo-doctor`, depois `npx expo install expo-modules-core` e rodar de novo.
- **Contorno adotado:** nada instalado direto. O pnpm (`autoInstallPeers`) já liga o peer, e `require('expo-modules-core')` resolve a partir do `@ng-native/expo`. Aviso documentado no README.
- **Issue upstream:** rascunho abaixo

<details><summary>Rascunho da issue</summary>

**Título:** `@ng-native/expo`: `expo-modules-core` as a required peer conflicts with Expo's "do not install directly" check

**Descrição:**

`@ng-native/expo` 0.3.0 declares `expo-modules-core@^57` as a required peer dependency (used by `nativeHalfMissing` in `native.js`). `expo-doctor` then reports it as a missing peer that "may crash outside of Expo Go". Installing it makes `expo-doctor` report the opposite: "expo-modules-core should not be installed directly … use the exported API from the expo package".

Since `expo` always brings `expo-modules-core`, could the peer be marked optional in `peerDependenciesMeta`, or the check use `requireOptionalNativeModule` re-exported from `expo`? Either would keep `expo-doctor` clean.

</details>

