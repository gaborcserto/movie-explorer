import { defineConfig } from 'vite-plus';

const cache = {
  env: ['NODE_ENV', 'TZ'],
  input: [
    'src/**',
    'test/**',
    '*',
    '.*',
    { pattern: 'package.json', base: 'workspace' },
    { pattern: 'package-lock.json', base: 'workspace' },
    { pattern: 'packages/contracts/src/**', base: 'workspace' },
    { pattern: 'packages/contracts/*.json', base: 'workspace' },
  ],
  output: [],
};

export default defineConfig({
  run: {
    tasks: {
      'task:dev': { command: 'npm run dev', cache: false },
      'task:build': {
        command: 'npm run build',
        dependsOn: ['@movie-explorer/contracts#task:build'],
        cache: { ...cache, output: ['dist/**'] },
      },
      'task:lint': {
        command: 'npm run lint',
        dependsOn: ['@movie-explorer/contracts#task:lint'],
        cache,
      },
      'task:typecheck': {
        command: 'npm run typecheck',
        dependsOn: ['@movie-explorer/contracts#task:typecheck'],
        cache,
      },
      'task:test': { command: 'npm test', cache },
      'task:coverage': {
        command: 'npm run test:coverage',
        cache: { ...cache, output: ['coverage/**'] },
      },
      'task:e2e': {
        command: 'npm run test:e2e',
        dependsOn: ['task:build'],
        cache: false,
      },
    },
  },
});
