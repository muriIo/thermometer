// Única camada que conhece o Apps Script. A lógica fica em módulos testáveis no Node.
import { rotear } from './rotear';
import { lerTokens } from './tokens';

export {
  aplicarFormulas,
  gerarRecorrenciasEFaturas,
  prepararAbas,
  verificarFormulas,
} from './menu';
export { criarAbaDoProximoAno } from './menu-ano';
export {
  gerarAbaMigracao,
  importarMigracao,
  registrarSaldos,
  relatorioValidacao,
} from './menu-migracao';
export { parcelarLinhaSelecionada } from './menu-parcelar';

import { criarMenu } from './menu';

declare const __VERSAO_SCRIPT__: string;

export function onOpen(): void {
  criarMenu();
}

export function doPost(
  evento: GoogleAppsScript.Events.DoPost,
): GoogleAppsScript.Content.TextOutput {
  let resposta: ReturnType<typeof rotear>;
  try {
    resposta = rotear(evento.postData?.contents ?? '', {
      tokens: lerTokens(PropertiesService.getScriptProperties().getProperty('TOKENS')),
      versaoScript: __VERSAO_SCRIPT__,
      agora: () => new Date(),
    });
  } catch (erro) {
    console.error(erro);
    resposta = { ok: false, error: { code: 'INTERNAL', message: 'Erro interno' } };
  }
  return ContentService.createTextOutput(JSON.stringify(resposta)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
