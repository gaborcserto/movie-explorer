# NestJS API design in Movie Explorer

Use this reference for general `apps/api` changes. Keep provider-specific
integration work routed to `tmdb-integration` and public response contract
changes routed to `api-contract-change`.

## Keep modules as feature boundaries

Nest modules declare which controllers and providers belong to a feature and
which dependencies it exposes. Keep a feature's controller and application
service together, and import another feature module only when the dependency
belongs to that module's public surface. Avoid making modules global or
exporting providers simply to bypass clear ownership. Preserve the current
MoviesModule and MovieProvider boundary when extending movie behavior.

The dependency direction should remain legible:

```text
HTTP request -> controller -> application service -> provider/integration
                                      contracts <- mapped response
```

## Use dependency injection at the application boundary

Inject dependencies instead of constructing service collaborators inside
request handlers. Use a class token when the dependency is a class and a
symbol/string token when an application-owned interface needs a runtime token.
Bind that token in the feature module, keeping provider selection and
configuration out of controller logic. Avoid request-scoped providers unless
per-request state is necessary; they affect the dependency tree and lifetime
of consumers.

For Movie Explorer, `MoviesService` depends on `MOVIE_PROVIDER`, while
`MoviesController` depends on `MoviesService`. Keep behavior and provider
selection in those existing layers instead of adding direct TMDB calls to a
controller.

## Keep controllers thin and services explicit

Controllers translate HTTP inputs into calls to application behavior and
return the resulting application response. Use route and parameter pipes for
small HTTP-bound conversions. Put reusable decisions and orchestration in a
service or provider where they can be tested without HTTP. Avoid duplicating
business rules in multiple route handlers.

## Validate and transform request DTOs at runtime

TypeScript interfaces and annotations are erased at runtime. Nest's
`ValidationPipe` needs concrete DTO classes with runtime metadata; decorators
define accepted values, while `class-transformer` can convert query strings
to numbers when `transform` is enabled. Keep constraints close to the DTO and
retain the application's global validation configuration. For example, the
existing query DTO pattern converts and bounds a page number:

```ts
export class MoviePageQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  page?: number = 1;
}
```

This illustrates class-validator metadata used with the configured global
pipe. Do not assume TypeScript types alone validate untrusted query or body
data, and do not weaken input bounds as a shortcut.

## Preserve useful HTTP errors

Throw an appropriate Nest exception when the request cannot be fulfilled, and
allow the framework's exception layer to produce the HTTP response. Use an
exception filter only when the application needs consistent translation or
logging at a boundary. Do not catch every error and replace it with a generic
success-shaped value or response; preserve known status semantics and avoid
returning provider internals, credentials, or stack traces to clients.

## Optional diagnostic: NestJS Doctor

[NestJS Doctor](https://github.com/RoloBits/nestjs-doctor) is an optional
static diagnostic for architectural, correctness, security, performance, and
schema findings. A scan can help investigate a concrete structural concern,
but its score and rules are external opinions, not repository policy. Review
each finding against the code and project conventions; do not add it as a
required check, install it, or initialize its agent skills as part of routine
work.

## Sources and attribution

This reference uses original Movie Explorer explanations and examples. It
does not reproduce third-party skill text or implementation code.

- NestJS, [Modules](https://docs.nestjs.com/modules),
  [Providers](https://docs.nestjs.com/providers),
  [Controllers](https://docs.nestjs.com/controllers),
  [Validation](https://docs.nestjs.com/techniques/validation), and
  [Exception Filters](https://docs.nestjs.com/exception-filters).
- TypeScript, [TypeScript for the New Programmer: erased types](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch#erased-types).
- RoloBits,
  [nestjs-doctor](https://github.com/RoloBits/nestjs-doctor), consulted only
  for its optional static-analysis capabilities. Its repository identifies
  its license as MIT; this reference includes no copied implementation.
- Jeff Allan,
  [claude-skills](https://github.com/Jeffallan/claude-skills), consulted for
  topic coverage; the project examples and recommendations here are original.
