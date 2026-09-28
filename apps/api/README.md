# Movie Explorer API

NestJS backend for Movie Explorer. It exposes movie search and detail
endpoints backed by TMDB, with application-owned response contracts and
generated Swagger/OpenAPI documentation.

Install dependencies from the repository root, copy `.env.example` to `.env`,
and provide a `TMDB_ACCESS_TOKEN` before starting the API:

```bash
npm run start:dev --workspace @movie-explorer/api
```

The API listens on `http://localhost:4000`. OpenAPI documentation generated
from the NestJS controllers and DTOs is available at `/api-docs`.

The workspace provides `build`, `lint`, `typecheck`, `test`, and `test:e2e`
scripts. Its unit and e2e tests use Jest; the e2e suite uses a mocked provider
and does not call TMDB.
