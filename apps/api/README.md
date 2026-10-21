# Movie Explorer API

NestJS backend for Movie Explorer. It exposes movies, series, seasons,
episodes, people and search backed by TMDB, with application-owned contracts and
generated Swagger/OpenAPI documentation.

Install dependencies from the repository root, copy `.env.example` to `.env`,
and provide a `TMDB_ACCESS_TOKEN` before starting the API:

```bash
npm run start:dev --workspace @movie-explorer/api
```

The API listens on `http://localhost:4000`. OpenAPI documentation generated
from the NestJS controllers and DTOs is available at `/api-docs`.

`GET /api/v1/movies` accepts page-based search, genre, release-year, minimum-rating,
and sort parameters and returns TMDB pagination metadata in the public
contract. `GET /api/v1/movies/suggestions` provides compact title suggestions for the
frontend autocomplete without exposing the TMDB access token.

Public resource roots are `/api/v1/movies`, `/api/v1/series`,
`/api/v1/persons` and `/api/v1/search`. The former `/movies` and `/api/v1/tv`
route trees return 404. See the root README for the season, episode and
episode-credit recovery routes. Swagger contains only canonical operations.

Application-owned code uses Series, Season and Episode naming. TMDB still
uses `/3/tv`, `season`, `episode` and `media_type: 'tv'`; these external
contracts are unchanged. The public `mediaType: 'tv'` discriminator remains
stable for existing identities. Browser navigation continues to use `/tv/...`.

The workspace provides `build`, `lint`, `typecheck`, `test`, and `test:e2e`
scripts. Its unit and e2e tests use Jest; the e2e suite uses a mocked provider
and does not call TMDB.
