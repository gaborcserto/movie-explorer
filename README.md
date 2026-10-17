# Movie Explorer

Movie Explorer lets you search and browse movies, view details, and explore cast, photos, and videos. The React frontend uses the NestJS API for movie data so TMDB credentials stay on the server and provider responses are mapped to application contracts.

## Screenshots

![Movie Explorer search page](docs/screenshots/home.png)

![Movie Explorer movie details page](docs/screenshots/details.png)

## Features

- Search movies and people with shared keyboard accessible autocomplete on Home and both detail headers.
- Switch between shareable Movies and People results; filter and sort movies, and load ten more results at a time.
- View movie details, cast, photos, and videos.
- Open high resolution photos in a lightbox with fullscreen, zoom, pan, and touch gestures.
- Browse a responsive interface with lazy loaded thumbnails and responsive images.

## Tech stack

- React 19, TypeScript, React Router, and SCSS
- NestJS 11, class-validator, and Swagger/OpenAPI
- npm Workspaces and Vite+ with Vite Task
- Vitest and React Testing Library for frontend tests; Jest for API unit and e2e tests
- Oxlint, ESLint, Stylelint, and TypeScript checks; Oxfmt for API formatting

## Getting started

Prerequisites: Node.js 24 and npm 11.6.2 or newer. These match the Node.js major version used in CI and the package manager declared by the repository.

Install dependencies from the repository root and create the API environment file from its safe example:

```sh
npm ci
cp apps/api/.env.example apps/api/.env
```

Set `TMDB_ACCESS_TOKEN` in `apps/api/.env` to a TMDB read access token. The other `TMDB_*` settings have defaults; their available names are listed in the example. The frontend's `VITE_API_BASE_URL` defaults to `http://localhost:4000` and only needs to be set when the API runs at another address. See the [API](apps/api/.env.example) and [web](apps/web/.env.example) environment examples for variable names and safe defaults. Do not commit `.env` files or credentials.

Start the frontend and API together:

```sh
npm run dev
```

The frontend is at [http://localhost:5173](http://localhost:5173) and the API listens at [http://localhost:4000](http://localhost:4000).

## Development and checks

Run these scripts from the repository root. Vite Task coordinates the workspace tasks.

```sh
npm run dev
npm run build
npm run lint
npm run typecheck
npm test
npm run coverage
npm run test:e2e
```

The API e2e task builds the API and runs its mocked provider suite; it does not need TMDB credentials. GitHub Actions runs lint, typecheck, coverage, build, and API e2e checks on pull requests and pushes to `main`. To run one app during development, use `npm run dev --workspace @movie-explorer/web` or `npm run start:dev --workspace @movie-explorer/api`.

## API documentation

The running API serves its generated Swagger/OpenAPI documentation at [http://localhost:4000/api-docs](http://localhost:4000/api-docs). The API keeps TMDB integration details server side and returns the shared application contracts.

`GET /api/v1/persons/:id` returns a person profile and movie filmography for a positive integer TMDB person ID. It returns 400 for invalid IDs, 404 for missing persons, and 502 for failed or incomplete provider responses. Optional metadata is omitted when unavailable; birthdays, death dates, and release dates remain date-only strings.

Filmography merges acting and crew credits by movie ID in first-seen order (cast followed by crew), excluding explicitly adult records. `actingCredits` contains distinct character names; an empty array records acting with an unknown character, while an absent field means no acting credit. `crewCredits` contains distinct department/job pairs, with unavailable values omitted. Movie summaries use an empty poster URL for missing posters and an empty genres array because the appended credits do not supply genre names. No per-movie requests, sorting, or pagination are performed.

Existing `/movies` endpoints are unchanged. Movie details retain `cast` and `director` and add structured `castMembers` and `directors` with optional person IDs and responsive portraits. Person pages are available at `/person/:id`, with portraits, biographies, and filmographies.

Unified autocomplete uses `GET /api/v1/search/suggestions?query=Alien&limit=6`. The limit applies to each group (maximum 10); the UI displays up to six movies and six people. Suggestions have a `mediaType` discriminator (`movie` or `person`), stable IDs, optional image URLs, and release year or known-for department. The existing `GET /movies/suggestions` response remains movie-only. Separate TMDB movie/person searches preserve movie ranking and prevent TV results from displacing people; no suggestion detail requests are made.

`GET /api/v1/persons?query=Weaver&page=1` returns `people`, `page`, `totalPages`, and `totalResults`. Queries are trimmed, nonempty, and bounded to 100 characters; pages are bounded to 1-500. Search URLs use `/search/:searchQuery?view=people`; Movies is the default when `view` is absent. Movie filters remain in the URL when switching, but are never sent to person search. Each view loads on first visit and retains its own pagination while switching within the current query.

## Project structure

```text
apps/
  api/                 NestJS API and TMDB integration
    src/movies/        Movie endpoints and application logic
    src/persons/       Person endpoint, DTOs, and application logic
    src/integrations/  External provider integrations
    test/              API end-to-end tests
  web/                 React frontend
    src/components/    Search, filters, movie cards, and details
    src/pages/         Application pages
    src/util/          Frontend API client and utilities
packages/
  contracts/           Shared TypeScript API contracts
```
