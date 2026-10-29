# Movie Explorer API

NestJS 11 API for movies, series, people, and search. TMDB provides catalog data; OMDb can provide optional IMDb ratings.

## Development

Install dependencies from the repository root with `npm ci`. Copy the environment example and set the required `TMDB_ACCESS_TOKEN`:

```sh
cp apps/api/.env.example apps/api/.env
npm run start:dev --workspace @movie-explorer/api
```

The API listens on port `4000` by default. `PORT` and `HOST` can override the listener. Swagger UI and the generated OpenAPI document are available at `http://localhost:4000/api-docs`.

## Configuration

The example file lists the optional TMDB base URL, image URL, language, region, and request timeout settings. `TMDB_REQUEST_TIMEOUT_MS` defaults to `8000` and accepts values from `1` to `60000` milliseconds. `OMDB_API_KEY` enables optional IMDb ratings; `OMDB_API_URL` defaults to `https://www.omdbapi.com/`.

## API resources

All routes use the `/api/v1` prefix:

- Movies: `/movies`
- Series, seasons, and episodes: `/series`
- Persons and filmographies: `/persons`
- Unified search and suggestions: `/search`
- Curated discovery feeds: `/discover/:section`
- IMDb-only ratings: `/ratings`

Swagger documents individual endpoints, parameters, and response schemas. Legacy `/movies` and `/api/v1/tv` route trees are not supported.

## Checks

Run these from the repository root:

```sh
npm test --workspace @movie-explorer/api
npm run test:e2e --workspace @movie-explorer/api
npm run lint --workspace @movie-explorer/api
npm run build --workspace @movie-explorer/api
```

The e2e suite uses a mocked provider and does not call TMDB. Keep `.env` files and credentials out of version control.
