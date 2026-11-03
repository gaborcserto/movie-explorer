# Movie Explorer

Movie Explorer is a React and NestJS app for browsing movies, series, and people with TMDB data.

## Screenshots

- [Home](docs/screenshots/home.png)
- [Movie details](docs/screenshots/details.png)

## Features

- Discover trending, recent, popular, and upcoming movies and series, plus
  popular people.
- Search movies, series, and people with keyboard-accessible autocomplete.
- Browse and filter results, with shareable search and detail routes.
- Explore movie and series details, cast, photos, videos, watch providers, and optional IMDb ratings.
- Browse Favorites-based homepage recommendations with independent Popular fallback for Movies/Series, and Similar titles after detail-page Media.
- View person profiles and filmographies, plus season and episode details.
- Use the responsive photo viewer with zoom, pan, and fullscreen controls.

## Tech stack

- React 19, TypeScript 6, React Router, and SCSS
- NestJS 11, TMDB and optional OMDb integrations
- npm Workspaces and Vite+ task orchestration
- Vitest and React Testing Library; Jest for the API
- Oxlint, ESLint, Stylelint, and TypeScript checks; Vite+/Oxfmt formats web
  and API files with workspace-specific options

## Getting started

Use Node.js 24 and npm 11.6.2. From the repository root:

```sh
npm ci
cp apps/api/.env.example apps/api/.env
```

Set `TMDB_ACCESS_TOKEN` in `apps/api/.env`. `OMDB_API_KEY` is optional and enables IMDb ratings. The frontend defaults to `http://localhost:4000` in development and same-origin `/api/v1` requests in production; set `VITE_API_BASE_URL` in `apps/web/.env` to use another API address.

Start both apps with `npm run dev`. The web app runs at [http://localhost:5173](http://localhost:5173), the API at [http://localhost:4000](http://localhost:4000), and Swagger UI at [http://localhost:4000/api-docs](http://localhost:4000/api-docs).

## Development and verification

Run workspace tasks from the root:

```sh
npm run dev
npm run lint
npm run typecheck
npm test
npm run coverage
npm run build
npm run test:e2e
```

The API end-to-end suite uses a mocked provider and does not require TMDB credentials.

Frontend `lint` runs Oxlint, ESLint 9 Flat Config, TypeScript, an independent
Oxfmt check, and Stylelint for SCSS. Run individual checks with
`npm run <script> --workspace @movie-explorer/web`: `lint:oxlint`,
`lint:eslint`, `typecheck`, `format:check`, or `lint:styles`.
Use `format` to apply Oxfmt or `lint:fix` to apply the available lint and
formatting fixes, then rerun `lint`. CI runs the same combined lint task through
Vite+. The staged-file hook also formats web source and styles independently.

ESLint owns React, Hooks, accessibility, import boundaries and type-aware checks;
Oxlint owns the explicitly configured core and TypeScript syntax checks.
The API retains its separate
ESLint 8 configuration.

Type checking and declaration generation use TypeScript 6.0.3. Frontend
typechecks include both application source and the Vite configuration project.
Native Vite+ type-aware checking is available, but does not replace these
compiler checks or declaration builds.

## Documentation

- [Recommendation API, candidate caching and data ownership](docs/recommendations.md)
- [AWS serverless deployment, OIDC setup, costs and SEO limitations](docs/deployment.md)

The AWS foundation uses private S3/CloudFront and an HTTP API/Lambda backend.
After the production build, run `npm run aws:package`, `npm run aws:test` and
`npm run aws:synth` for credential-free artifact and infrastructure checks.
These commands use the Vite+ task graph, reusing unchanged prerequisite builds.
Packaging, artifact smoke tests and synthesis always execute.
Deployment is manual, disabled by default, and requires separately authorized
AWS bootstrap and a protected GitHub environment. No cloud resources are created
by the local checks.
