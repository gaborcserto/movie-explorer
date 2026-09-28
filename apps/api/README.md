# Movie Explorer API

NestJS backend for Movie Explorer. It exposes movie search and detail endpoints
backed by TMDB.

Install dependencies from the repository root, copy the safe values described
in `.env.example` into your local environment, and provide a
`TMDB_ACCESS_TOKEN` before starting the API.

```bash
npm run start:dev
```

The API listens on `http://localhost:4000`. OpenAPI documentation generated
from the NestJS controllers and DTOs is available at `/api-docs`.

Use the root workspace scripts for repository-wide checks. The API workspace
also provides `build`, `lint`, `typecheck`, `test`, and `test:e2e` scripts.
