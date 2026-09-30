# Change an API contract safely

Use this skill when changing `packages/contracts` or a public movie API shape.
The repository boundaries and commands are defined in the root `AGENTS.md`.

- Inspect the contract, API DTO/controller/provider flow, frontend API client,
  and existing tests before editing.
- Keep shared types application-owned and provider-neutral. Do not copy TMDB
  response types into the public contract.
- Update the backend implementation and frontend consumers together. Preserve
  optionality, pagination, query semantics, and error behavior unless the
  change explicitly requires otherwise.
- Add or update observable tests for both API mapping/behavior and affected
  frontend behavior. Run contracts typecheck plus both app checks; use broader
  verification for breaking or cross-workspace changes.
