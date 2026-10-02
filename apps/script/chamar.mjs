// Chama o Web App para testes manuais da API (Fase 3), sempre na Planilha Teste.
// Uso: pnpm --filter @termometro/script chamar <acao> '[payload JSON]'
// TERMOMETRO_URL e TERMOMETRO_TOKEN vêm do ambiente ou de apps/script/.env (fora do Git).
// O Apps Script responde com 302 para script.googleusercontent.com; o fetch segue sozinho.
const [acao, payload = 'null'] = process.argv.slice(2);
const { TERMOMETRO_URL: url, TERMOMETRO_TOKEN: token } = process.env;

const faltando = [!url && 'TERMOMETRO_URL', !token && 'TERMOMETRO_TOKEN'].filter(Boolean);
if (!acao || faltando.length > 0) {
  if (faltando.length > 0)
    console.error(`Faltando: ${faltando.join(', ')} (no ambiente ou em apps/script/.env).`);
  console.error("Uso: pnpm --filter @termometro/script chamar <acao> '[payload JSON]'");
  process.exit(1);
}

const resposta = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ v: 1, token, action: acao, payload: JSON.parse(payload) }),
});
const texto = await resposta.text();
try {
  console.warn(JSON.stringify(JSON.parse(texto), null, 2));
} catch {
  console.error(`Resposta não é JSON (HTTP ${resposta.status}):\n${texto.slice(0, 500)}`);
  process.exit(1);
}
