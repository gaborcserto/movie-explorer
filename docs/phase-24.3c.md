# Phase 24.3C implementation and verification

## Initial dependency audit

The working tree was clean before implementation. Reported baseline counts were
checked against the existing suites: 397 frontend, 145 API unit, 38 API e2e tests.

| Section | TMDB source | Required/optional | Previous failure behavior | Implemented behavior |
| --- | --- | --- | --- | --- |
| Movie profile | Movie detail record | Required | Contextual full-detail error | Remains fatal with existing classification and guarded Retry |
| Credits / cast and crew | Appended credits | Optional | Missing/incomplete append rejected the page | Preserve primary and other sections; explicit unavailable state |
| Photos | Appended images/backdrops | Optional | Missing/incomplete append rejected the page | Preserve other content; original-resolution URLs and lightbox retained |
| Videos | Appended videos/results | Optional | Missing/incomplete append rejected the page | Preserve other content; video lightbox retained |
| Person profile and biography | Person detail record | Required | Contextual full-detail error | Remains fatal |
| Filmography | Appended movie credits, cast and crew | Optional | Missing/incomplete append rejected the page | Preserve profile; filmography-specific unavailable state |
| Movie suggestions | Movie search | Independent | Promise.all rejected both groups | Retain this group when person search fails |
| Person suggestions | Person search | Independent | Promise.all rejected both groups | Retain this group when movie search fails |

There are no recommendations or separate person photo sections in the existing
flow. Hero images come from the primary record. The initial detail requests use
append_to_response, rather than one request per optional field.

## Contract and backend

Existing response fields remain. Additive metadata describes credits/photos/videos
in MovieDetails.sections, PersonDetails.filmographyAvailability, and movie/person
groups in SearchSuggestionsResponse.groups. Each state is either
available (including successful empty data) or unavailable, with an optional safe
retryAfterSeconds delay. Metadata is optional for compatibility with older servers;
the current provider supplies it. Empty collections on an unavailable section are
placeholders; consumers must use the availability state.

Successful appended requests remain one request. Appended sections are checked and
mapped independently; malformed optional data is isolated, while malformed primary
data remains fatal. An eligible atomic 502 transport/upstream failure permits one
profile-only fallback. Invalid JSON, 404, 429, timeout and malformed primary data
do not trigger fallback. A timeout remains 504, rate limits remain 429, and other
upstream failures remain sanitized 502. No retry loops or timeout-default changes.

Four small recovery routes follow controller -> service -> provider:
GET /movies/:id/credits, /photos, /videos, and
GET /api/v1/persons/:id/filmography. They request only the selected upstream
resource and return mapped section fields. IDs use the existing validation.
Failures remain HTTP errors; full details return 200 when the primary is usable.
Optional diagnostics contain operation/category/status, without bodies, raw
messages, credentials or upstream URLs.

Autocomplete uses Promise.allSettled. Both failures preserve a classified HTTP
error, with rate limits prioritized when applicable; partial responses retain safe
rate-limit delay metadata for the unavailable group.

## Frontend behavior

Local states distinguish loading, empty and unavailable sections. Retry remains
keyboard accessible, guards duplicate requests, honors safe rate-limit delays,
aborts on unmount and ignores obsolete responses before merging. Successful
sections remain mounted. Focus moves to the surviving local status only when the
retry control still holds focus, with preventScroll. Cancellation stays silent.
Filmography remains mounted and skips URL canonicalization while unavailable,
preserving Acting/Crew and sorting parameters until recovery.

Existing hero layout, cast links, media grids/lightboxes, high-resolution photos,
filmography sorting and Load More remain. No popcorn illustration is used for
local errors, and global styles, motion settings and palette are unchanged.

Partial autocomplete retains group ranking and the existing flat keyboard order.
Available options remain selectable with ArrowUp/ArrowDown and Enter. Partial
empty results show unavailable feedback instead of claiming no suggestions.
Escape, outside dismissal, active-option scrolling, cancellation, stale-response
guards and search submission remain covered by the existing suite.

The API boundary checks availability discriminants, required primary/section
fields used by the new structures, recovered section content and suggestion
discriminants. Unavailable movie data is cleared before rendering. Malformed
partial structures produce the existing invalid-response handling.

## Verification

- Focused frontend tests cover retained content, empty/unavailable distinctions,
  repeated recovery failures, duplicate guards, cancellation, stale routes,
  focus, rate-limit delays, filmography URL controls and partial autocomplete.
- Provider tests cover independent/multiple failed appends, valid empty results,
  primary failure, bounded fallback, safe logging and section-only requests.
- API e2e tests cover new routes, ID validation, partial 200 responses and
  independent autocomplete.
- Root lint (including Stylelint), workspace typechecks, production builds and
  API e2e passed. API unit coverage passed: 163 tests. API e2e: 44 tests.
- Frontend coverage passed with 415 tests using
  npm run test:coverage --workspace @movie-explorer/web -- --maxWorkers=1.
  Coverage: statements 95.12%, branches 88.88%, functions 95.92%, lines 96.48%.
  The first new countdown test needed timer advancement in separate React updates;
  that test is fixed. Concurrent full coverage attempts hit an existing filter
  timeout and a later mobile scroll-lock assertion. The filter tests passed in
  isolation and in the final single-worker full run; their source and assertions
  were preserved.
- git diff --check passed; final diff reviewed. No dependency changes, commit
  or push.

Browser checks used the running Vite app and deterministic fetch fixtures; no
real TMDB requests. Movie and person partial failures retained primary content.
Recovery requested only the failed section. Movie scroll stayed at 172px from
request start through success; person scroll stayed at 0px. Focus landed on the
local status. Person Crew/title controls remained selected. Partial autocomplete
worked with ArrowDown and Enter selection.

Movie partial, person partial and partial autocomplete were checked in same-origin
app iframe viewports at 320, 390, 768, 1024 and 1440px. All had no horizontal
overflow; local controls and partial suggestion feedback fit their containers.
The preview environment blocked the external Montserrat font through CORS, so
these geometry checks used the available fallback font. This is not a claim of
complete WCAG AA compliance; the documented white-on-coral exception remains.

## Compatibility and follow-ups

Older successful responses without metadata remain accepted. Older clients keep
their existing fields but need updating to distinguish unavailable from empty.
Broader legacy successful-JSON validation and a shared error schema remain
separate follow-ups. An appended request that fails atomically cannot identify
which section caused it; profile-only fallback marks missing sections unavailable
and leaves section-specific recovery to the user. Sequential fallback can exceed
the browser deadline on a slow upstream. Browser verification used fixtures,
rather than live provider behavior.

## Files added

- [phase-24.3c.md](phase-24.3c.md)
- [tmdb-partial.provider.spec.ts](../apps/api/src/integrations/tmdb/tmdb-partial.provider.spec.ts)
- [search.service.spec.ts](../apps/api/src/search/search.service.spec.ts)
- [section-availability.dto.ts](../apps/api/src/validation/section-availability.dto.ts)
- [sectionRecovery.scss](../apps/web/src/components/details/sectionRecovery.scss)
- [sectionRecovery.test.tsx](../apps/web/src/components/details/sectionRecovery.test.tsx)
- [sectionRecovery.tsx](../apps/web/src/components/details/sectionRecovery.tsx)
- [partialResponses.test.ts](../apps/web/src/util/partialResponses.test.ts)
- [partialValidation.ts](../apps/web/src/util/partialValidation.ts)
- [availability.ts](../packages/contracts/src/availability.ts)

## Files modified

- [README.md](../README.md)
- [tmdb-movie.provider.spec.ts](../apps/api/src/integrations/tmdb/tmdb-movie.provider.spec.ts)
- [tmdb-movie.provider.ts](../apps/api/src/integrations/tmdb/tmdb-movie.provider.ts)
- [tmdb-person.provider.spec.ts](../apps/api/src/integrations/tmdb/tmdb-person.provider.spec.ts)
- [tmdb-search.provider.spec.ts](../apps/api/src/integrations/tmdb/tmdb-search.provider.spec.ts)
- [movie-provider.ts](../apps/api/src/movies/movie-provider.ts)
- [movies.controller.ts](../apps/api/src/movies/movies.controller.ts)
- [movies.dto.ts](../apps/api/src/movies/movies.dto.ts)
- [movies.service.spec.ts](../apps/api/src/movies/movies.service.spec.ts)
- [movies.service.ts](../apps/api/src/movies/movies.service.ts)
- [persons.controller.ts](../apps/api/src/persons/persons.controller.ts)
- [persons.dto.ts](../apps/api/src/persons/persons.dto.ts)
- [persons.service.spec.ts](../apps/api/src/persons/persons.service.spec.ts)
- [persons.service.ts](../apps/api/src/persons/persons.service.ts)
- [search.service.ts](../apps/api/src/search/search.service.ts)
- [app.e2e-spec.ts](../apps/api/test/app.e2e-spec.ts)
- [detailRecovery.test.tsx](../apps/web/src/components/details/detailRecovery.test.tsx)
- [details.tsx](../apps/web/src/components/details/details.tsx)
- [detailsContent.tsx](../apps/web/src/components/details/detailsContent.tsx)
- [autocomplete.test.tsx](../apps/web/src/components/search/autocomplete.test.tsx)
- [useAutocomplete.ts](../apps/web/src/components/search/useAutocomplete.ts)
- [filmography.tsx](../apps/web/src/pages/personPage/filmography.tsx)
- [personPage.tsx](../apps/web/src/pages/personPage/personPage.tsx)
- [apiUtils.ts](../apps/web/src/util/apiUtils.ts)
- [index.ts](../packages/contracts/src/index.ts)
- [movies.ts](../packages/contracts/src/movies.ts)
- [persons.ts](../packages/contracts/src/persons.ts)
- [search.ts](../packages/contracts/src/search.ts)
