import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettier from 'eslint-config-prettier/flat';
import oxlint from 'eslint-plugin-oxlint';
import globals from 'globals';

import oxlintConfig from './.oxlintrc.json' with { type: 'json' };

export default [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  ...tsPlugin.configs['flat/recommended'],
  prettier,
  {
    files: ['{src,test}/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      'no-loss-of-precision': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // Retain the existing division between Oxlint and type-aware ESLint rules.
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
        { blankLine: 'always', prev: '*', next: 'return' },
      ],
    },
  },
];
