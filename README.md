# Movie Explorer

Movie Explorer is a React and NestJS app for browsing movies, series, and people with TMDB data.

## Screenshots

- [Home](docs/screenshots/home.png)
- [Movie details](docs/screenshots/details.png)

## Features

- Search movies, series, and people with keyboard-accessible autocomplete.
- Browse and filter results, with shareable search and detail routes.
- Explore movie and series details, cast, photos, videos, watch providers, and optional IMDb ratings.
- View person profiles and filmographies, plus season and episode details.
- Use the responsive photo viewer with zoom, pan, and fullscreen controls.

## Tech stack

- React 19, TypeScript, React Router, and SCSS
- NestJS 11, TMDB and optional OMDb integrations
- npm Workspaces and Vite+ task orchestration
- Vitest and React Testing Library; Jest for the API
- Oxlint, ESLint, Stylelint, and TypeScript checks; Oxfmt formats API files

## Getting started

Use Node.js 24 and npm 11.6.2. From the repository root:

```sh
npm ci
cp apps/api/.env.example apps/api/.env
```

Set `TMDB_ACCESS_TOKEN` in `apps/api/.env`. `OMDB_API_KEY` is optional and enables IMDb ratings. The frontend defaults to `http://localhost:4000`; set `VITE_API_BASE_URL` in `apps/web/.env` to use another API address.

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

## Documentation

- [Frontend](apps/web/README.md)
- [Backend API](apps/api/README.md)
