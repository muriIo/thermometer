/**
 * Fronteiras de camada. Ver docs/engenharia.md, seção 2.
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'sem-ciclos',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'dominio-e-puro',
      comment: 'packages/dominio não importa nada fora de si mesmo (nem npm, nem node).',
      severity: 'error',
      from: { path: '^packages/dominio/src' },
      to: { pathNot: '^packages/dominio/src' },
    },
    {
      name: 'contract-so-dominio-e-zod',
      severity: 'error',
      from: { path: '^packages/contract/src' },
      to: {
        pathNot: ['^packages/contract/src', '^packages/dominio/src', 'node_modules/zod/'],
      },
    },
    {
      name: 'pacotes-nao-importam-apps',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'apps-nao-se-importam',
      severity: 'error',
      from: { path: '^apps/([^/]+)/' },
      to: { path: '^apps/', pathNot: '^apps/$1/' },
    },
    {
      name: 'mobile-aplicacao-sem-ui-nem-infra',
      comment: 'Casos de uso dependem de portas; ui e infra ficam do lado de fora.',
      severity: 'error',
      from: { path: '^apps/mobile/src/aplicacao' },
      to: { path: '^apps/mobile/src/(ui|infra)' },
    },
    {
      name: 'mobile-aplicacao-sem-framework',
      comment: 'Casos de uso são TS puro, testáveis sem Angular nem dispositivo.',
      severity: 'error',
      from: { path: '^apps/mobile/src/aplicacao' },
      to: { path: 'node_modules/(@angular|@ng-native|expo|react-native|react)' },
    },
    {
      name: 'mobile-ui-sem-infra',
      comment: 'A ui recebe a infra por injeção; só src/main.ts monta as implementações.',
      severity: 'error',
      from: { path: '^apps/mobile/src/ui' },
      to: { path: '^apps/mobile/src/infra' },
    },
    {
      name: 'mobile-infra-sem-ui',
      severity: 'error',
      from: { path: '^apps/mobile/src/infra' },
      to: { path: '^apps/mobile/src/ui' },
    },
    {
      name: 'sem-dependencia-nao-declarada',
      comment:
        'Pacotes do workspace aparecem como "undetermined"; a declaração deles no package.json é verificada pelo knip.',
      severity: 'error',
      from: {},
      to: {
        dependencyTypes: ['unknown', 'undetermined', 'npm-no-pkg', 'npm-unknown'],
        pathNot: '^packages/[^/]+/src/',
      },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['/dist/', '/coverage/'] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    combinedDependencies: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'types', 'default'],
    },
  },
};
