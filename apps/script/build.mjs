// Empacota o script num único arquivo para o Apps Script (PROJECT.md, seção 7).
// O Apps Script só enxerga funções globais declaradas, então cada ponto de
// entrada exportado por src/main.ts ganha um "stub" global no rodapé.
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const PONTOS_DE_ENTRADA = [
  'doPost',
  'onOpen',
  'prepararAbas',
  'gerarRecorrenciasEFaturas',
  'aplicarFormulas',
  'verificarFormulas',
  'criarAbaDoProximoAno',
  'registrarSaldos',
  'gerarAbaMigracao',
  'importarMigracao',
  'relatorioValidacao',
];
const { version } = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));

await mkdir('dist', { recursive: true });
await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'iife',
  globalName: 'Termometro',
  target: 'es2020',
  outfile: 'dist/Code.js',
  banner: { js: '/** @OnlyCurrentDoc */' },
  footer: {
    js: PONTOS_DE_ENTRADA.map(
      (nome) => `function ${nome}(...args) { return Termometro.${nome}(...args); }`,
    ).join('\n'),
  },
  define: { __VERSAO_SCRIPT__: JSON.stringify(version) },
  logLevel: 'info',
});
await copyFile('appsscript.json', 'dist/appsscript.json');
