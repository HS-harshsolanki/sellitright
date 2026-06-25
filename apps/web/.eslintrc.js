module.exports = {
  root: true,
  extends: [require.resolve('@sellitright/eslint-config/nextjs')],
  parserOptions: {
    project: './tsconfig.json',
  },
}
