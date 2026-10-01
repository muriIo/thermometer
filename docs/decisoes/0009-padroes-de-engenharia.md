# 0009 — Padrões de engenharia: Biome, fronteiras, duplicação

- Status: aceita
- Data: 2026-10-01

## Contexto
O objetivo é uma base de código sustentável, com arquitetura documentada, código limpo e sem duplicação, editada por pessoas e agentes.

## Decisão
- Biome para lint e formatação (sem ESLint/Prettier); TypeScript strict.
- dependency-cruiser para fronteiras de camada; jscpd para duplicação; knip para código morto; lefthook + commitlint.
- Regra de negócio só em `packages/dominio` / `packages/contract`.
- Documentação viva: `PROJECT.md`, `CONTEXT.md`, ADRs, `docs/engenharia.md`, atualizados no mesmo PR.
- Detalhes em `docs/engenharia.md`.

## Alternativas consideradas
- **ESLint + Prettier:** mais plugins (inclusive para templates Angular), porém mais lento e com mais configuração. Se o template do Angular Native exigir ESLint, ele fica restrito a `apps/mobile` com um ADR novo.

## Consequências
- CI mais rigoroso desde a Fase 0; limites (jscpd, cobertura) podem ser ajustados com justificativa no PR.
