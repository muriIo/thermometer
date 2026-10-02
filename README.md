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
| `pnpm --filter @termometro/mobile start` | Metro do app; abra no Expo Go (Android) pelo QR code. |
| `pnpm --filter @termometro/mobile bundle` | Gera os bundles Android e iOS do Metro em `apps/mobile/dist/` (o CI roda). |

## Estrutura

| Pasta | O quê |
|---|---|
| `packages/dominio` | Regras puras (centavos, datas, parcelas, faturas…). Não importa nada. |
| `packages/contract` | Contrato app ↔ script (tipos + schemas zod). |
| `apps/script` | Apps Script em TypeScript (Web App + menu da planilha). |
| `apps/mobile` | App Angular Native + Expo. Guia para agentes em [`apps/mobile/AGENTS.md`](apps/mobile/AGENTS.md). |

## App no celular (Expo Go)

`pnpm start` dentro de `apps/mobile` e leia o QR code no Expo Go (Android ou iPhone, mesmo Wi-Fi do computador).

O app fala com o Web App **de teste** (Planilha Teste). Uma vez, crie `apps/mobile/.env.local` (fora do Git) com `EXPO_PUBLIC_API_URL=<URL /exec do Web App de teste>` e reinicie o Metro. A URL vai para dentro do bundle; o token não: ele é digitado no primeiro acesso e fica no Secure storage do aparelho. No iPhone, o Expo Go é o teste de iOS até a Fase 6 (`PROJECT.md`, seção 18).

**WSL2:** com `networkingMode=mirrored` no `.wslconfig`, o Metro já anuncia o IP da rede local, mas o firewall do Hyper-V bloqueia a entrada e o Expo Go dá timeout. Uma vez, num PowerShell como administrador:

```powershell
New-NetFirewallHyperVRule -Name "Metro-8081" -DisplayName "Metro (Expo) 8081" -Direction Inbound -VMCreatorId '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -Protocol TCP -LocalPorts 8081 -Action Allow
```

Para conferir, abra `http://<IP do computador>:8081/status` no navegador do celular: deve mostrar `packager-status:running`. Se ainda falhar, verifique a permissão de Rede Local do Expo Go (iOS) e se o Wi-Fi não isola os aparelhos (rede de convidados). Último recurso: `pnpm exec expo start --tunnel`.

## APK preview (Android, EAS)

O APK de teste vai para o celular da Thays por link, sem Play Store. Aponta para o Web App **de teste** até a virada (ver `PROJECT.md`, seção 11). Comandos dentro de `apps/mobile`, com `pnpm dlx eas-cli@24.9.0` (ou `eas` instalado globalmente).

Uma vez por máquina e por projeto:

1. `eas login` com a conta da Expo.
2. `eas init`: cria o projeto no expo.dev e grava `extra.eas.projectId` (e `owner`) no `app.json`. Commite essa mudança.
3. `eas env:set preview --name EXPO_PUBLIC_API_URL --value <URL /exec do Web App de teste> --visibility plaintext`. A URL fica no EAS, não no repositório; o token nunca vai para o build. O `env:set` cria ou atualiza (o antigo `env:create` está obsoleto): é o mesmo comando para trocar a URL, por exemplo na virada para o Web App de produção. Variável nova ou alterada só vale a partir do próximo build.

A cada APK:

1. `eas build --platform android --profile preview`. No primeiro, aceite que o EAS gere e guarde a keystore: ela assina todos os APKs seguintes, e perdê-la obriga a desinstalar o app (e perder a fila guardada no aparelho) para instalar uma versão nova.
2. Ao terminar, o EAS mostra um link e um QR code. No Android, abra o link, baixe o APK e permita instalar de fontes desconhecidas quando o sistema pedir.
3. No primeiro acesso, cole o token da pessoa (propriedade `TOKENS` do Web App de teste).

O número do build (`versionCode`) sobe sozinho a cada build (`autoIncrement`, versão remota no EAS), então um APK novo instala por cima do anterior sem apagar os dados.

### Update OTA (EAS Update)

Mudança só de JS, template ou estilo vai sem APK novo:

```sh
eas update --channel preview --environment preview --message "o que mudou"
```

`--environment preview` é obrigatório: é ele que põe `EXPO_PUBLIC_API_URL` no JS publicado; sem ele o app perde a URL do Web App. O app procura updates ao abrir e ao voltar ao primeiro plano, e reinicia no update na volta seguinte se a tela Lançar não estiver aberta (`apps/mobile/src/ui/atualizacoes.ts`).

O update só chega a APKs com a mesma `runtimeVersion`, calculada pelo fingerprint do que é nativo. Dependência com código nativo, plugin ou campo nativo do `app.json` mudou: o fingerprint muda, o update não chega aos APKs antigos, e é preciso um `eas build` novo. O `eas update` mostra a runtime publicada; a página do build mostra a do APK. APKs feitos antes do `expo-updates` (build 2) não recebem update: instale um APK novo uma vez.

`npx expo-doctor` acusa `expo-modules-core` como dependência peer ausente do `@ng-native/expo`. Com pnpm é falso positivo: o pnpm liga o peer sozinho, e instalar o pacote direto faz o próprio doctor reclamar do contrário (ver `docs/ng-native-feedback.md`).

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

Teste rápido (só na Planilha Teste):

```sh
# uma vez: apps/script/.env (fora do Git) com
#   TERMOMETRO_URL=<URL /exec do Web App de teste>
#   TERMOMETRO_TOKEN=<token>
pnpm --filter @termometro/script chamar ping
pnpm --filter @termometro/script chamar referencias
pnpm --filter @termometro/script chamar listar '{"de":"2026-11-01","ate":"2026-11-30"}'
pnpm --filter @termometro/script chamar resumo '{"data":"2026-11-05"}'
```

Critério da Fase 3, à mão:

1. `lancar` uma linha (`{"linhas":[{"id":"<uuid>","data":"…","valorCentavos":800,"tipo":"diario","quem":"Thays","meio":"avista","status":"confirmado"}]}`) duas vezes: a aba ganha **uma** linha.
2. `lancar` um parcelado (3 linhas com o mesmo `grupoId`, `parcelaN` 1–3, `parcelas` 3, `meio` cartao, `cartao` INTER): `fatura_id` em três meses seguidos.
3. `editar` um previsto com a `versao` devolvida e `"status":"confirmado"`: confirma.
4. Mude o valor dessa linha à mão na planilha e repita o `editar` com a versão antiga: `CONFLICT`.
5. Token errado: `UNAUTHORIZED`. Payload inválido (ex.: `valorCentavos` negativo): `INVALID_PAYLOAD`.
