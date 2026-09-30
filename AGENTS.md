# Movie Explorer agent guide

Movie Explorer is a full-stack movie search and browsing application. The
repository is an npm workspace monorepo orchestrated by Turborepo. Preserve
working behavior and keep changes focused; this file is repository context,
not a general development handbook.

## Repository boundaries

- `apps/web` is the React 19, TypeScript, Vite, React Router, and SCSS
  frontend. It owns browser UI, URL-persisted search/filter state, and the
  API client in `src/util/apiUtils.ts`.
- `apps/api` is the NestJS API. Controllers under `src/movies` handle HTTP,
  services delegate application behavior, and `MovieProvider` is the provider
  boundary.
- `apps/api/src/integrations/tmdb` is the TMDB integration. It owns TMDB
  configuration, external response types, HTTP calls, and mapping to the
  application's movie models.
- `packages/contracts` is the intentionally shared public TypeScript contract
  package. Both apps consume its movie query and response types. Keep it free
  of app-specific implementation details.

The frontend must call the application API rather than TMDB directly. The API
must map TMDB responses to application-owned contracts and must not expose the
TMDB access token or raw provider response shapes.

## Commands

Install from the repository root with `npm install` (CI uses `npm ci`). Root
commands run the matching workspace tasks through Turborepo:

```text
npm run dev
npm run lint
npm run typecheck
npm test
npm run coverage
npm run build
npm run test:e2e
```

The root `test:e2e` command targets `@movie-explorer/api`; it builds required
workspaces and runs the mocked-provider NestJS e2e suite. The CI quality gate
runs lint, typecheck, coverage, build, and e2e checks. Turborepo task
dependencies in `turbo.json` are part of that ordering.

Useful narrower commands are:

```text
npm run lint --workspace @movie-explorer/web
npm run typecheck --workspace @movie-explorer/web
npm test --workspace @movie-explorer/web
npm test --workspace @movie-explorer/api
npm run test:coverage --workspace @movie-explorer/web
npm run test:coverage --workspace @movie-explorer/api
npm run start:dev --workspace @movie-explorer/api
```

The web lint command includes ESLint, TypeScript, and Stylelint
(`lint:eslint`, `lint:typescript`, and `lint:styles`). API lint is ESLint.
Frontend tests use Vitest and React Testing Library; API unit and e2e tests use
Jest. API source tests are `*.spec.ts`; frontend tests are `*.test.ts` or
`*.test.tsx`. Pre-commit uses Husky and lint-staged for changed web/API
TypeScript and web style files; the staged commands also run Prettier where
configured. The API also exposes `npm run format --workspace
@movie-explorer/api` for formatting its source and e2e files.

## Coding conventions

- Inspect the existing implementation, tests, configuration, and neighboring
  patterns before changing architecture. Preserve existing behavior unless a
  change is explicitly required.
- Keep changes small, focused, readable, and reviewable. Prefer descriptive
  names and focused functions/components over clever code.
- Prefer existing local patterns when they are still appropriate. Introduce
  an abstraction only when it solves a concrete problem; avoid unnecessary
  wrappers, factories, generic utilities, speculative abstractions, dead code,
  and generated-looking AI boilerplate.
- Do not invent APIs, package APIs, configuration options, environment
  variables, framework behavior, database fields, endpoints, or requirements.
  Verify library APIs and project conventions before using them.
- Avoid `any` and unnecessary type assertions. Prefer inference, explicit
  domain types, or `unknown` with proper narrowing. Do not silence TypeScript,
  ESLint, or Stylelint errors merely to make checks pass.
- Validate untrusted or external data at system boundaries. Preserve the
  existing SCSS behavior; do not replace the styling system as unrelated
  modernization.
- Avoid obvious performance regressions, but do not introduce complex
  optimizations without evidence of a real problem.

### Frontend conventions

- Keep API communication behind the existing service boundary rather than
  embedding HTTP details in UI components. Do not hardcode backend URLs;
  use environment-based configuration and safe `.env.example` files.
- Use React Router and URL parameters for shareable search, filtering,
  sorting, pagination, and selected-resource state where appropriate. Use
  local React state for local UI state and avoid storing the same state in
  multiple places without a clear reason.
- Prefer semantic HTML, native controls, keyboard accessibility, and visible
  focus behavior. Add ARIA only when native semantics are insufficient.
- Keep components focused and do not rename files or components mechanically.

### Backend and API conventions

- Keep the responsibility flow clear: controller → service → provider or
  integration. Keep controllers thin, use NestJS dependency injection and
  module boundaries, and keep application logic in services where appropriate.
- Validate request DTOs. Separate query, request, response, and integration
  models when that improves clarity, and use explicit application-owned
  response contracts.
- Keep external integrations isolated from application/domain logic. Do not
  expose third-party response structures directly from the Movie Explorer API.
- Improve error handling without replacing useful errors with generic ones,
  while avoiding sensitive implementation details in client responses.

### Shared contracts

Use `packages/contracts` only for intentionally shared public contracts. When a
contract changes, inspect and update the backend implementation, frontend
consumers, and relevant tests together. Do not move backend implementation
types there merely to share code, and keep provider-specific TMDB types inside
the TMDB integration.

## Testing expectations

- Existing tests are valuable; preserve them unless they are intentionally
  replaced. Add or update tests when changing user-facing behavior or
  business logic.
- Prefer observable behavior over tests that only mirror implementation
  details. Add tests for important behavior that is currently untested, but
  do not chase arbitrary 100% coverage.
- Do not delete, disable, weaken, or bypass a failing test merely to make the
  suite pass. Report checks that could not be verified.
- Run the narrowest relevant check first. For broader changes, also run the
  relevant lint, typecheck, tests, coverage, build, and e2e checks.

## Working rules

- Keep changes scoped; do not change application functionality or UI while
  working on tooling or documentation tasks.
- Run the narrowest useful check while iterating, then broaden verification
  when the change crosses workspaces, contracts, dependencies, or tooling.
- Review the diff and run `git diff --check` before handoff. Do not edit
  `dist`, `coverage`, `node_modules`, or other generated output.

## Dependencies, configuration, and secrets

Make the smallest dependency change needed, review major-version breaking
changes, and update `package-lock.json` only when dependencies or workspace
tooling intentionally change. Dependabot handles routine updates; major or
otherwise risky upgrades are manual and should be verified broadly.

Do not blindly upgrade every dependency at once. Keep dependency upgrades
separate from unrelated refactoring when practical, remove dependencies that
are no longer used, and do not add a dependency when the language, platform,
framework, or existing stack already provides a reasonable solution. Keep the
application working between modernization phases whenever practical.

Use the safe examples in `apps/api/.env.example` and `apps/web/.env.example`.
The API reads `TMDB_ACCESS_TOKEN` and optional `TMDB_*` settings; the frontend
uses `VITE_API_BASE_URL`. Never hardcode or expose TMDB credentials, commit
`.env` files, log secrets, or place production values in examples.

## Documentation and agent behavior

Keep the root `README.md` aligned with the actual project purpose,
architecture, setup, environment variables, scripts, testing, API usage, and
development workflow. Do not leave generated framework README content as the
primary project documentation; use comments for important reasoning rather
than restating code.

Inspect only files relevant to the requested change before expanding scope,
and avoid reading generated output, caches, dependencies, or unrelated files
unless necessary. Reuse repository conventions, do not repeatedly run the
full suite after minor edits, and keep final reports concise and evidence
based.

Do not rewrite history, commit, or push unless the user explicitly requests
it. Avoid unrelated cleanup, broad formatting, and changes outside the stated
scope.

## Agent infrastructure

Use `.agents/skills` for focused knowledge that is repeatedly useful for a
type of change, and `.agents/workflows` for repeatable execution sequences.
Keep those files short and refer back to this guide for commands and general
rules. Available repository-specific guidance includes verification selection,
shared contract changes, TMDB integration changes, feature changes,
dependency updates, and final verification.
