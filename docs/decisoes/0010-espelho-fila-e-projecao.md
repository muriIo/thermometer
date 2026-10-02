# 0010 — Sincronização: espelho, fila e projeção

- Status: aceita
- Data: 2026-10-02

## Contexto
O app precisa lançar sem rede, mostrar o lançamento na hora e nunca perder nem duplicar (critério da Fase 4). "A planilha sempre vence" (PROJECT.md, 8.4): uma leitura substitui o cache. O PROJECT.md previa uma coluna `sync_status` em cada linha do cache, o que obriga toda leitura a mesclar linha a linha o que veio da planilha com o que ainda está pendente.

Também há reenvio ambíguo: se a resposta se perde depois de o script aplicar, `lancar` é idempotente por `id`, mas um `editar` reenviado volta `CONFLICT` (a versão já mudou) e um `excluir` reenviado volta `NOT_FOUND` (a linha já está excluída).

## Decisão
- **Espelho:** o cache guarda só linhas como a planilha devolveu. Nada pendente entra nele. Ler a planilha é substituir o intervalo lido.
- **Fila:** operações `lancar` / `editar` / `excluir`, em ordem, guardadas no aparelho antes de aparecer na tela. Uma por vez, na ordem; leitura e envio nunca se cruzam.
- **Projeção:** a tela vê o espelho com a fila aplicada por cima (função pura). A situação de cada linha (`sincronizado`, `pendente`, `enviando`, `travado`) vem da fila, não de uma coluna.
- **Encadeamento:** `editar`/`excluir` sobre uma linha que ainda tem operação pendente guardam `versaoVista` nula; quando a anterior conclui, a versão devolvida pela planilha passa para a seguinte.
- **Reenvio:** `excluir` com `NOT_FOUND` conta como concluído. `editar` guarda a versão esperada depois da edição; com `CONFLICT`, o app relê a linha e conclui se a versão bate. Senão é conflito real: a operação sai da fila e o usuário é avisado.
- **Falhas:** rede e `INTERNAL` tentam de novo, com espera dobrando de 2 s a 5 min. `UNAUTHORIZED` e `UNSUPPORTED_VERSION` param a fila. `INVALID_PAYLOAD` trava a operação à vista (não some) sem segurar as outras; o usuário descarta.
- **Estimativa:** saldo e consumo de hoje são os do último `resumo` mais a diferença que a fila faz na projeção e o efeito das operações concluídas depois desse `resumo` (ADR 0007).

## Alternativas consideradas
- **`sync_status` por linha (PROJECT.md original):** cada leitura teria de preservar linhas pendentes e reaplicar edições locais à mão, o mesmo trabalho da projeção, só que espalhado e com estado duplicado.
- **Tratar todo `CONFLICT` como conflito:** simples, mas uma confirmação com a resposta perdida viraria um falso aviso de conflito, comum em rede móvel ruim.
- **Descartar operação recusada:** perderia o lançamento sem o usuário ver.

## Consequências
- A camada `aplicacao` do app (`apps/mobile/src/aplicacao`) é TS puro e testada com um script falso que derruba a rede antes e depois de aplicar.
- O SQLite guarda `espelho` e `fila` como tabelas separadas, sem `sync_status`.
- Edição de linha fora do intervalo lido não aparece projetada até a próxima leitura que a inclua.
