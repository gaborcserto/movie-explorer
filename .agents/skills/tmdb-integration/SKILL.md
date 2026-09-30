# Change the TMDB integration

Use this skill for changes under `apps/api/src/integrations/tmdb` or behavior
that changes TMDB requests/mapping. Follow the repository rules in the root
`AGENTS.md`.

- Keep TMDB access behind `MovieProvider` and the existing backend integration
  boundary. Do not add direct TMDB calls or credentials to frontend code.
- Preserve the mapper/domain boundary: external TMDB types stay in the
  integration, while API responses use `@movie-explorer/contracts`.
- Keep configuration environment-based. Never expose, log, hardcode, or test
  with a real `TMDB_ACCESS_TOKEN`.
- Handle provider failures through the existing application error behavior;
  do not leak tokens, raw external errors, or unnecessary provider details.
- Update mapper/provider/config tests for request parameters, mapping, missing
  data, and failure paths. The API e2e suite uses a mocked provider and does
  not require TMDB credentials.
