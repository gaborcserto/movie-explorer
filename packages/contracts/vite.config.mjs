import { defineConfig } from 'vite-plus';

const cache = {
  env: ['NODE_ENV'],
  input: [
    'src/**',
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
      'task:lint': { command: 'npm run lint', cache },
      'task:typecheck': { command: 'npm run typecheck', cache },
    },
  },
});
