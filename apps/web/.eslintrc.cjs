const oxlint = require('eslint-plugin-oxlint');
const oxlintConfig = require('./.oxlintrc.json');

module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'airbnb',
    'airbnb-typescript',
    'prettier',
    'plugin:prettier/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'tsconfig.json'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['react-refresh', 'prettier'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    'no-param-reassign': [2, { props: false }],
    'react/require-default-props': 'off',
    'react/jsx-props-no-spreading': 'off',
    "react/jsx-uses-react": "off",
    "react/react-in-jsx-scope": "off",
    'no-restricted-exports': 0,
    '@typescript-eslint/naming-convention': 'off',
    'jsx-a11y/label-has-associated-control': [
      'error',
      {
        required: {
          some: ['nesting', 'id'],
        },
      },
    ],
    'jsx-a11y/label-has-for': [
      'error',
      {
        required: {
          some: ['nesting', 'id'],
        },
      },
    ],
    'prettier/prettier': ['error', { endOfLine: 'auto' }],
    // Disable only the core rules explicitly enabled in Oxlint. Keep the
    // option-sensitive Airbnb and type-aware rules in ESLint.
    ...Object.fromEntries(
      Object.keys(oxlintConfig.rules).map((rule) => [
        rule,
        oxlint.configs.all.rules[rule],
      ])
    ),
  },
  overrides: [
    {
      // Expand to components and pages after their readability batch.
      files: ['src/util/**/*.{ts,tsx}', 'src/**/use*.{ts,tsx}'],
      rules: {
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
    },
  ],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
};
