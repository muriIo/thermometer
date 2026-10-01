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
