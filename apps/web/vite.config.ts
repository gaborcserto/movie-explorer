import { defineConfig, lazyPlugins } from 'vite-plus';
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';

// Explicit inputs cover new files as well as files read by the tools.
const cache = {
  env: ['NODE_ENV', 'TZ', 'VITE_*'],
  input: [
    'src/**',
    'public/**',
    '*',
    '.*',
    { pattern: 'package.json', base: 'workspace' as const },
    { pattern: 'package-lock.json', base: 'workspace' as const },
    { pattern: 'packages/contracts/src/**', base: 'workspace' as const },
    { pattern: 'packages/contracts/*.json', base: 'workspace' as const },
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
    },
  },
  plugins: lazyPlugins(() => [react()]),
  css: {
    postcss: {
      plugins: [autoprefixer({})],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: ['src/index.tsx', 'src/vite-env.d.ts'],
    },
  },
});
