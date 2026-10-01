export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['dominio', 'contract', 'script', 'mobile', 'docs', 'ci', 'deps', 'repo'],
    ],
  },
};
