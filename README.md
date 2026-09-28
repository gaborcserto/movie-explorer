# Movie Explorer

Movie Explorer is a full-stack movie application organized as an npm
workspace monorepo.

## Structure

- `apps/web` - React, TypeScript, and Vite frontend
- `apps/api` - NestJS backend API

## Setup

Install dependencies once from the repository root:

```bash
npm install
```

The backend reads movie data from TMDB. Use `apps/api/.env.example` as
the reference for required environment variables and provide
`TMDB_ACCESS_TOKEN` in the backend runtime environment before running
`apps/api`.

## Root Commands

```bash
npm run dev
npm run build
npm run test
npm run lint
npm run typecheck
npm run test:e2e
```

The root scripts use Turborepo to run the matching workspace scripts.
