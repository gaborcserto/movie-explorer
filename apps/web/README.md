# Movie Explorer Web

React 19, TypeScript, and Vite frontend for Movie Explorer.

## Routes

- `/search` and `/search/:searchQuery` (browse and search)
- `/movie/:movieId` (movie details)
- `/tv/:id`, `/tv/:id/seasons/:seasonNumber`, and `/tv/:id/seasons/:seasonNumber/episodes/:episodeNumber` (series, season, and episode details)
- `/person/:id` (person details and filmography)

## Development

Install dependencies from the repository root with `npm ci`. Run the full app with `npm run dev`, or start only the frontend:

```sh
npm run dev --workspace @movie-explorer/web
```

Vite serves the frontend at `http://localhost:5173`. The API base URL defaults to `http://localhost:4000`; set `VITE_API_BASE_URL` in `apps/web/.env` to use another address. See [.env.example](.env.example).

## Structure

```text
src/
  components/   Search, filters, lists, details, and shared UI
  pages/        Search, person, and series pages
  util/         API client and data utilities
```

## Checks

Tests use Vitest and React Testing Library. Run checks from the repository root:

```sh
npm test --workspace @movie-explorer/web
npm run lint --workspace @movie-explorer/web
npm run build --workspace @movie-explorer/web
```

See the [root README](../../README.md) for setup and root-level commands, and the [API README](../api/README.md) for backend configuration and resources.
