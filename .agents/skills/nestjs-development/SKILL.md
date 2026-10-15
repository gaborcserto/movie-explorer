---
name: nestjs-development
description: Use for NestJS API changes in apps/api, including controllers, providers, modules, DTO validation, dependency injection, and error handling; excludes shared contract and TMDB-specific work.
---

# NestJS development

Use for general API implementation work in `apps/api`. Route public contract
changes to `api-contract-change` and provider request or mapping changes to
`tmdb-integration`. Follow the backend boundaries and commands in the root
`AGENTS.md`.

- Inspect the existing module, controller, service/provider flow, DTOs,
  configuration, and neighboring tests before editing.
- Keep controllers focused on HTTP concerns and delegate application behavior
  to providers or services through Nest dependency injection. Register
  dependencies in the appropriate module and preserve established boundaries.
- Validate request DTOs at the boundary, keep response types application-owned,
  and preserve useful error behavior without exposing secrets or internal
  details to clients.
- Add or update focused Jest tests for observable API behavior and relevant
  failure paths. Use `verify-change` to select checks from the actual scripts
  in `AGENTS.md`.

The optional [NestJS Doctor](https://github.com/RoloBits/nestjs-doctor) can be
considered as a diagnostic aid when investigating structural issues. Treat
its findings as suggestions to review against this repository's conventions;
it is not a required check. Do not install or initialize it as part of routine
development.

Refer to the official NestJS guides for [controllers](https://docs.nestjs.com/controllers),
[providers](https://docs.nestjs.com/providers), [modules](https://docs.nestjs.com/modules),
and [validation](https://docs.nestjs.com/techniques/validation).
For project-specific module, DTO, and error-handling examples, load [the NestJS API design reference](references/nestjs-api-design.md).
