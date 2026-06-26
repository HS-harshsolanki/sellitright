/** @type {import('lint-staged').Config} */
export default {
  // Prettier: format any changed formattable file
  '**/*.{ts,tsx,js,mjs,cjs,json,md,yaml,css}': ['prettier --write'],
  // ESLint: when any TS/TSX file changes, lint the whole web app.
  // next lint doesn't accept individual filenames — it lints the configured dirs.
  'apps/web/src/**/*.{ts,tsx}': () => 'pnpm --filter web lint',
}
