import { defineConfig } from 'vite-plus';

const cache = {
  env: ['NODE_ENV'],
  input: [
    '*.ts',
    '*.json',
    'vite.config.mjs',
    { pattern: 'package.json', base: 'workspace' },
    { pattern: 'package-lock.json', base: 'workspace' },
  ],
  output: [],
};

export default defineConfig({
  run: {
    tasks: {
      'task:build': {
        command: 'npm run build',
        cache: { ...cache, output: ['dist/**'] },
      },
      'task:lint': { command: 'npm run lint', cache: false },
      'task:typecheck': { command: 'npm run typecheck', cache },
      'task:test': {
        command: 'node --test test/*.test.cjs',
        dependsOn: ['task:build'],
        cache: false,
      },
      'task:coverage': {
        command: 'node --test --experimental-test-coverage test/*.test.cjs',
        dependsOn: ['task:build'],
        cache: false,
      },
      'task:package': {
        command: 'npm run package:lambda',
        dependsOn: ['@movie-explorer/api#task:build'],
        cache: false,
      },
      'task:package-test': {
        command: 'npm run test:package',
        dependsOn: ['task:test'],
        cache: false,
      },
      'task:synth': {
        command: 'npm exec -- cdk synth MovieExplorer --no-lookups',
        dependsOn: ['task:build'],
        cache: false,
      },
    },
  },
});
