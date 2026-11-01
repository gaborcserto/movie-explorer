import { defineConfig } from 'vite-plus';

export default defineConfig({
  run: {
    tasks: {
      'task:build': { command: 'npm run build', cache: false },
      'task:lint': { command: 'npm run lint', cache: false },
      'task:typecheck': { command: 'npm run typecheck', cache: false },
      'task:test': { command: 'npm test', cache: false },
      'task:coverage': { command: 'npm run test:coverage', cache: false },
    },
  },
});
