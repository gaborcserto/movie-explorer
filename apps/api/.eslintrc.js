const oxlint = require('eslint-plugin-oxlint');
const oxlintConfig = require('./.oxlintrc.json');

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: ['plugin:@typescript-eslint/recommended', 'prettier'],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    // Keep type-aware rules in ESLint; disable only the syntax
    // rules explicitly enabled in Oxlint.
    ...Object.fromEntries(
      Object.keys(oxlintConfig.rules).map((rule) => [
        rule,
        oxlint.configs.all.rules[rule],
      ]),
    ),
    'padding-line-between-statements': [
      'error',
      {
        blankLine: 'always',
        prev: ['const', 'let', 'var'],
        next: ['if', 'try', 'for', 'while', 'switch'],
      },
      {
        blankLine: 'always',
        prev: '*',
        next: 'return',
      },
    ],
  },
};
