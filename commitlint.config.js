/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Scopes allowed in this monorepo
    'scope-enum': [
      2,
      'always',
      [
        'web',
        'api',
        'auth',
        'admin',
        'sell',
        'browse',
        'dashboard',
        'listing',
        'infra',
        'db',
        'ci',
        'deps',
        'config',
        'e2e',
        'test',
        'docs',
      ],
    ],
    // Keep subjects concise
    'subject-max-length': [2, 'always', 100],
    // Allow sentence case (capital first letter)
    'subject-case': [0],
  },
}
