# 0001 — Angular Native, Android primeiro, e registro de bugs

- Status: aceita
- Data: 2026-10-01

## Contexto
O app precisa funcionar offline e lançar em ~3 s. Um objetivo explícito do projeto é testar o Angular Native (alpha) e contribuir com o seu desenvolvimento. O Murilo usa iPhone; a Thays, Android. iOS exige Apple Developer Program (US$ 99/ano).

## Decisão
- App em Angular Native + Expo, versões fixadas.
- Primeira versão só no Android (APK por distribuição interna do EAS). iOS fica para depois, sem data.
- Todo bug, limitação ou dificuldade vai para `docs/ng-native-feedback.md`, com rascunho de issue. Publicar a issue é decisão do Murilo.

## Alternativas consideradas
- **PWA (Angular comum):** funcionaria nos dois celulares já, de graça; descartada porque testar o Angular Native é objetivo do projeto.
- **Expo + React Native:** estável, mas também não atende o objetivo e continua exigindo a conta Apple.

## Consequências
- Murilo não usa o app no próprio celular até a Fase 6; valida pelo Android e pela planilha.
- Risco de alpha mitigado por lógica fora da UI (`packages/dominio`) e versões fixas.
