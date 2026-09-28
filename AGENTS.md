# Repository Guidelines

## Project Structure

This repository contains Movie Explorer, a full-stack movie application
being modernized from two previously independent applications into a
cohesive monorepo.

Current migration baseline:

-   `apps/web`: React + TypeScript + Vite frontend.
-   `apps/api`: NestJS backend API.

The current structure, dependencies, naming, and patterns are a
migration baseline, not necessarily the final architecture. Preserve
existing behavior while improving the code incrementally.

Target direction:

-   npm workspaces at the repository root.
-   Turborepo for monorepo task orchestration.
-   `apps/web` for the frontend.
- `apps/api` for the backend.
-   `packages/contracts` for genuinely shared public API contracts where
    useful.
-   Root-level build, lint, test, and type-check workflows.
-   Modern supported dependency versions and strict TypeScript.

Do not introduce monorepo complexity that the project does not need.

## Common Commands

Until root workspace tooling is introduced, run commands from the
relevant app directory.

Frontend:

``` bash
cd apps/web
npm install
npm run dev
npm run build
npm run lint
npm test
```

Backend:

``` bash
cd apps/api
npm install
npm run start:dev
npm run build
npm run test
npm run test:e2e
```

Use `npm run lint:typescript`, `npm run lint:eslint`, or
`npm run lint:styles` in `apps/web` when a narrower frontend check is
useful.

After root workspace tooling is introduced, prefer documented root-level
scripts for repository-wide operations.

## Coding Conventions

-   Understand the existing implementation, tests, configuration, and
    surrounding code before modifying it.
-   Preserve existing behavior unless a change is explicitly required.
-   Keep changes small, focused, and reviewable.
-   Prefer readable, maintainable, human-friendly code over clever
    abstractions.
-   Prefer existing local patterns when they are still appropriate, but
    do not preserve legacy patterns merely because they already exist.
-   Avoid unnecessary boilerplate, wrappers, factories, helpers, generic
    utilities, and premature abstractions.
-   Introduce an abstraction only when it solves a concrete problem.
-   Use descriptive names for variables, functions, components, hooks,
    classes, types, DTOs, and files.
-   Keep functions and components focused.
-   Prefer modern language and framework patterns when they improve
    clarity and maintainability.
-   Do not invent APIs, package APIs, configuration options, environment
    variables, framework behavior, database fields, endpoints, or
    requirements.
-   Verify library APIs and existing project conventions before using
    them.
-   Avoid `any`; prefer inference, explicit domain types, or `unknown`
    with proper narrowing.
-   Do not silence TypeScript, ESLint, or Stylelint errors merely to
    make checks pass.
-   Validate untrusted or external data at system boundaries.
-   Preserve the existing SCSS behavior during initial modernization; do
    not replace the styling system merely because another solution is
    newer.
-   Do not perform unrelated cleanup while implementing a focused task.

### Frontend Direction

The existing frontend structure under `apps/web/src` is
legacy-compatible and may be reorganized when a change provides clear
value.

Target direction:

-   TanStack Query for server state such as movie lists, movie details,
    loading, errors, caching, refetching, and mutations where
    appropriate.
-   React Router and URL search parameters for shareable navigation
    state such as search, filtering, sorting, pagination, and selected
    resources where appropriate.
-   Local React state for local UI state.
-   React Context only for a clear cross-component concern.
-   Remove Redux when its remaining state can be represented more simply
    with server state, URL state, or local state.
-   Do not replace Redux with another global state library unless there
    is a concrete need for global client state.
-   Avoid storing the same state in multiple places without a clear
    reason.
-   Keep API communication behind clear service/API boundaries rather
    than embedding HTTP details in UI components.
-   Do not hardcode backend URLs in application logic; use
    environment-based configuration and maintain safe `.env.example`
    files.
-   Prefer specific names such as `MovieCard`, `MovieList`,
    `MovieDetails`, `MovieForm`, `MovieFilters`, and `MovieSearch` when
    renaming improves clarity.
-   Do not rename files or components mechanically just to make them
    different.

Accessibility is part of implementation quality. Prefer semantic HTML,
preserve keyboard accessibility and visible focus behavior, use native
controls when practical, and add ARIA only when native semantics are
insufficient.

### Backend Direction

Backend movie API code currently lives under `apps/api/src/movies`.

Prefer a clear responsibility flow:

``` text
Controller
    ↓
Service
    ↓
Integration / persistence layer
```

-   Keep controllers thin.
-   Keep business and application logic in services or appropriate
    modules.
-   Use NestJS dependency injection and module boundaries.
-   Validate request DTOs.
-   Separate query, request, and response models when it improves
    clarity.
-   Use explicit application-owned response contracts.
-   Keep external integrations isolated from application/domain logic.
-   Do not expose third-party response structures directly as the Movie
    Explorer public API.
-   Improve error handling without replacing useful errors with generic
    ones.
-   Do not expose sensitive implementation details to clients.

Use `packages/contracts` only for intentionally shared public contracts.
Do not move backend implementation types there merely to share code.

### API Documentation

The existing backend contains legacy Swagger/OpenAPI documentation. Do
not assume the static `swagger.yaml` is authoritative.

During modernization, prefer a single source of truth. The intended
direction is NestJS Swagger/OpenAPI metadata with generated API
documentation where practical. Keep runtime behavior and API
documentation aligned, and avoid maintaining duplicated specifications
without a concrete reason.

## Testing Guidance

-   Existing tests are valuable; preserve them unless they are
    intentionally replaced.
-   Add or update tests when changing user-facing behavior or business
    logic.
-   Frontend tests use Jest with React Testing Library and are named
    `*.test.tsx` or `*.test.ts`.
-   Backend unit tests use Jest and are named `*.spec.ts`; e2e tests
    live under `apps/api/test`.
-   Prefer tests of observable behavior over tests that only mirror
    implementation details.
-   Do not delete, disable, or weaken failing tests merely to make the
    suite pass.
-   Add tests for important behavior that is currently untested.
-   Do not chase arbitrary 100% coverage.
-   Run the narrowest relevant checks first. For broader changes, also
    run relevant lint, type checks, tests, and builds.
-   Report which checks were run and anything that could not be
    verified.

## Dependency and Modernization Guidance

Modernize incrementally rather than rewriting the application.

Expected sequence:

``` text
existing applications
        ↓
monorepo baseline
        ↓
root workspace/tooling
        ↓
dependency upgrades
        ↓
type-safety improvements
        ↓
frontend state modernization
        ↓
architecture and naming cleanup
        ↓
test improvements
        ↓
CI
        ↓
documentation
        ↓
future feature development
```

-   Keep the application working between major phases whenever
    practical.
-   Do not blindly upgrade every dependency at once.
-   Review breaking changes for major upgrades.
-   Keep dependency upgrades separate from unrelated refactoring when
    practical.
-   Do not add a dependency when the language, platform, framework, or
    existing stack already provides a reasonable solution.
-   Remove dependencies that are no longer used after modernization.
-   Avoid obvious performance regressions, but do not introduce complex
    optimizations without evidence of a real problem.
-   The first priority is a stable, understandable, tested baseline.
    Major new features and external integrations come after that
    baseline.

## Operational Notes

-   Do not edit generated output directories such as `dist`, `coverage`,
    or dependency directories.
-   Do not modify lockfiles unless dependencies changed or
    install/workspace tooling intentionally updates them.
-   Never commit API keys, access tokens, passwords, credentials,
    secrets, or production environment values.
-   Use environment variables for environment-specific configuration and
    keep `.env.example` values safe.
-   Avoid logging secrets or sensitive values.
-   Do not commit or push unless explicitly requested.
-   Do not rewrite existing Git history; the original frontend and
    backend history was intentionally preserved during the monorepo
    migration.
-   Do not make broad formatting changes together with functional
    changes unless required.
-   Prefer one logical concern per commit.
-   Before considering a task complete, review the diff, verify the
    requested scope, run appropriate checks, and report important
    architectural decisions, breaking changes, and remaining issues.

## Documentation

Keep the root README aligned with the actual project. As modernization
progresses, document the project purpose, architecture, stack,
repository structure, setup, environment variables, scripts, testing,
API usage, and development workflow.

Do not leave generated framework README content as the primary project
documentation. Use comments to explain important reasoning, constraints,
or non-obvious decisions rather than restating the code.
