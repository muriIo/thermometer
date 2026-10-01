# 0006 — Conflito de edição detectado por hash do conteúdo

- Status: aceita
- Data: 2026-10-01

## Contexto
A aba Lançamentos é editada pelo app e à mão. `atualizado_em` só muda quando o script escreve, então uma correção manual não seria detectada e o app poderia sobrescrevê-la.

## Decisão
`versao` = hash dos campos de negócio da linha (função em `packages/dominio`). `listar` devolve a versão; `editar`/`excluir` enviam `versaoVista`; o script recalcula e responde `CONFLICT` se diferir.

## Alternativas consideradas
- **Gatilho `onEdit`:** não dispara em todas as formas de edição.
- **Não suportar edição manual:** contraria "tudo nos dois".

## Consequências
- Não depende de gatilhos; qualquer mudança é detectada. Campos de controle (`atualizado_em`) ficam fora do hash.
