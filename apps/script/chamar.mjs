// Chama o Web App para testes manuais da API (Fase 3), sempre na Planilha Teste.
// Uso: TERMOMETRO_URL=... TERMOMETRO_TOKEN=... node chamar.mjs <acao> '[payload JSON]'
// O Apps Script responde com 302 para script.googleusercontent.com; o fetch segue sozinho.
const [acao, payload = 'null'] = process.argv.slice(2);
const { TERMOMETRO_URL: url, TERMOMETRO_TOKEN: token } = process.env;

if (!acao || !url || !token) {
  console.error("Uso: TERMOMETRO_URL=... TERMOMETRO_TOKEN=... node chamar.mjs <acao> '[payload]'");
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
