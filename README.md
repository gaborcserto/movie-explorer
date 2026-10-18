# Movie Explorer

Movie Explorer lets you search and browse movies, view details, and explore cast, photos, and videos. The React frontend uses the NestJS API for movie data so TMDB credentials stay on the server and provider responses are mapped to application contracts.

## Screenshots

![Movie Explorer search page](docs/screenshots/home.png)

![Movie Explorer movie details page](docs/screenshots/details.png)

## Features

- Search movies and people with shared keyboard accessible autocomplete on Home and both detail headers.
- Switch between shareable Movies and People results; filter and sort movies, and load ten more results at a time.
- View movie details, cast, photos, and videos.
- Open high resolution photos in a lightbox with fullscreen, zoom, pan, and touch gestures.
- Browse a responsive interface with lazy loaded thumbnails and responsive images.

## Tech stack

- React 19, TypeScript, React Router, and SCSS
- NestJS 11, class-validator, and Swagger/OpenAPI
- npm Workspaces and Vite+ with Vite Task
- Vitest and React Testing Library for frontend tests; Jest for API unit and e2e tests
- Oxlint, ESLint, Stylelint, and TypeScript checks; Oxfmt for API formatting

## Getting started

Prerequisites: Node.js 24 and npm 11.6.2 or newer. These match the Node.js major version used in CI and the package manager declared by the repository.

Install dependencies from the repository root and create the API environment file from its safe example:

```sh
npm ci
cp apps/api/.env.example apps/api/.env
```

Set `TMDB_ACCESS_TOKEN` in `apps/api/.env` to a TMDB read access token. The other `TMDB_*` settings have defaults; their available names are listed in the example. The frontend's `VITE_API_BASE_URL` defaults to `http://localhost:4000` and only needs to be set when the API runs at another address. See the [API](apps/api/.env.example) and [web](apps/web/.env.example) environment examples for variable names and safe defaults. Do not commit `.env` files or credentials.

Start the frontend and API together:

```sh
npm run dev
```

The frontend is at [http://localhost:5173](http://localhost:5173) and the API listens at [http://localhost:4000](http://localhost:4000).

## Development and checks

Run these scripts from the repository root. Vite Task coordinates the workspace tasks.

```sh
npm run dev
npm run build
npm run lint
npm run typecheck
npm test
npm run coverage
npm run test:e2e
```

The API e2e task builds the API and runs its mocked provider suite; it does not need TMDB credentials. GitHub Actions runs lint, typecheck, coverage, build, and API e2e checks on pull requests and pushes to `main`. To run one app during development, use `npm run dev --workspace @movie-explorer/web` or `npm run start:dev --workspace @movie-explorer/api`.

## API documentation

The running API serves its generated Swagger/OpenAPI documentation at [http://localhost:4000/api-docs](http://localhost:4000/api-docs). The API keeps TMDB integration details server side and returns the shared application contracts.

`GET /api/v1/persons/:id` returns a person profile and movie filmography for a positive integer TMDB person ID. It returns 400 for invalid IDs, 404 for missing persons, and 502 for invalid primary data or sanitized upstream failures; rate limits return 429 and timeouts return 504. Optional metadata is omitted when unavailable; birthdays, death dates, and release dates remain date-only strings.

Filmography merges acting and crew credits by movie ID in first-seen order (cast followed by crew), excluding explicitly adult records. `actingCredits` contains distinct character names; an empty array records acting with an unknown character, while an absent field means no acting credit. `crewCredits` contains distinct department/job pairs, with unavailable values omitted. Movie summaries use an empty poster URL for missing posters and an empty genres array because the appended credits do not supply genre names. No per-movie requests, sorting, or pagination are performed.

Existing `/movies` endpoints are unchanged. Movie details retain `cast` and `director` and add structured `castMembers` and `directors` with optional person IDs and responsive portraits. Person pages are available at `/person/:id`, with portraits, biographies, and filmographies.

Unified autocomplete uses `GET /api/v1/search/suggestions?query=Alien&limit=6`. The limit applies to each group (maximum 10); the UI displays up to six movies and six people. Suggestions have a `mediaType` discriminator (`movie` or `person`), stable IDs, optional image URLs, and release year or known-for department. The existing `GET /movies/suggestions` response remains movie-only. Separate TMDB movie/person searches preserve movie ranking and prevent TV results from displacing people; no suggestion detail requests are made.

`GET /api/v1/persons?query=Weaver&page=1` returns `people`, `page`, `totalPages`, and `totalResults`. Queries are trimmed, nonempty, and bounded to 100 characters; pages are bounded to 1-500. Search URLs use `/search/:searchQuery?view=people`; Movies is the default when `view` is absent. Movie filters remain in the URL when switching, but are never sent to person search. Each view loads on first visit and retains its own pagination while switching within the current query.

## Request failures and deadlines

Browser API requests have a 12-second deadline, including JSON body reads. All existing request types use this default. Caller cancellation remains independent and silent in existing navigation/search flows; timeouts remain genuine failures eligible for manual retry. There are no automatic retry loops; detail requests have the bounded fallback described below. The API utility exposes typed categories (`invalid-request`, `not-found`, `rate-limited`, `internal-server`, `service-unavailable`, `http`, `network`, `timeout`, `cancelled`, `invalid-response`), retains available HTTP status, and keeps `isNotFoundError` compatibility. Rate-limit errors retain validated header delays as `retryAfterSeconds`. Invalid JSON is classified; successful JSON still uses endpoint contract types rather than comprehensive runtime schema validation in the browser.

TMDB requests default to 8 seconds, including body reads. Set `TMDB_REQUEST_TIMEOUT_MS` to decimal integer milliseconds from 1 to 60000; invalid configuration fails startup. Keep it below the browser deadline where practical. Each upstream request has its own deadline, so sequential provider calls can exceed one upstream deadline.

- Missing movie/person details return 404. Unexpected collection/search/genre 404 responses return 502; successful empty collections remain valid.
- Upstream 429 returns 429. A positive `Retry-After` delay up to 24 hours, supplied as integer seconds or a canonical future HTTP date, is normalized to seconds in the `Retry-After` response header and optional `retryAfter` body field. Invalid, expired, zero, or longer delays are omitted. CORS exposes this header.
- Upstream timeout returns 504. Connection failures, invalid JSON/required response structures, upstream authorization failures, and other upstream HTTP failures (including 5xx) return sanitized 502 responses. Missing credentials or invalid configuration prevent startup.
- Public errors retain Nest's `statusCode`, safe `message`, and standard `error` label where provided; validation messages remain arrays. Expected upstream failures log operation category, failure category, upstream status when known, and application status without raw messages, query text, credentials, or bodies.

Both detail route IDs accept decimal digits only, a positive integer at most `Number.MAX_SAFE_INTEGER`; leading zeroes are allowed. Scientific/hexadecimal notation, signs, fractions, whitespace, zero, and unsafe integers are rejected. The frontend shows a contextual invalid-ID state without fetching; the API returns 400. Valid missing IDs remain 404.

Error response types remain outside the shared success contracts; a shared error contract and schema migration are deferred. Detail errors use the shared contextual popcorn presentation, with safe messages for classified API failures. Invalid IDs and missing resources offer Back to Search without Retry. Recoverable failures offer a guarded manual Retry; validated rate-limit delays provide guidance without timers or automatic requests. Pending retries keep the action focused; success moves focus to the detail main landmark only when that action still holds focus. Cancellation stays silent. Search failures remain inline and pagination failures retain loaded results. Autocomplete failures are visible beside the input and Enter still submits the query.

Back to Search returns to the preceding search entry only when the app observed that Search-to-Detail push in the current session. This reuses bounded result and scroll snapshots, preserving query, view, filters, sorting and loaded depth. Direct entries, reloads, evicted history and detail-to-detail navigation fall back to `/search`; no persistent search storage or speculative history jumps are used. Fatal rendering errors retain full-document Reload and a native Search link, independent of router context, without resetting the failing tree or displaying an HTTP status.

### Partial details and independent autocomplete (Phase 24.3C)

The public response behavior is summarized below.

Detail responses retain their existing data fields and add optional availability metadata:
- Movie: `sections.credits`, `sections.photos`, `sections.videos`.
- Person: `filmographyAvailability`.
- Unified autocomplete: `groups.movie` and `groups.person`.

Each state is `{ status: 'available' }` (including successfully empty data) or
`{ status: 'unavailable', retryAfterSeconds?: number }`. Unavailable data must
never be interpreted as a successful empty section. Metadata is optional in the
TypeScript contracts to accept older successful responses; the current provider
always supplies it. Older clients can still read the existing data fields, but
need updating to distinguish unavailable sections.

Movie details retain one TMDB request with appended credits, images and videos;
person details retain one request with appended movie credits. Missing, failed or
malformed appends are isolated without additional requests. If that request fails
atomically with an eligible 502 (HTTP/connection failure), one profile-only request
can salvage the required record. Invalid JSON, invalid primary data, 404, 429 and
504 do not trigger fallback. No timeout defaults change. Sequential fallback may
still exceed the browser deadline on a slow upstream; cancellation remains silent.
There are no recommendations or independent person photo sections.

Manual recovery endpoints return only the mapped section:
- `GET /movies/:id/credits`: cast and crew fields.
- `GET /movies/:id/photos`: `{ photos: [...] }`.
- `GET /movies/:id/videos`: `{ videos: [...] }`.
- `GET /api/v1/persons/:id/filmography`: `{ filmography: [...] }`.

These endpoints validate IDs and preserve sanitized 429/502/504 behavior and safe
Retry-After headers. Retry affects only the selected section, guards pending
requests, and cancels/ignores obsolete work. Successful sections, media controls,
biography state and filmography URL controls remain intact. Local states have
section headings, loading feedback, explicit empty text, and compact unavailable
messages. After recovery, focus moves to the surviving local status only if the
retry control still held focus, without scrolling.

Unified autocomplete independently settles movie/person searches while retaining
provider ordering within each group. Partial results stay selectable, with subtle
unavailable feedback. A successful empty group alongside failure does not claim
that no suggestions exist. Both failures preserve existing classified error UX.
Enter still submits a search.

The frontend validates new availability discriminants, required section fields,
recovered section content, and partial suggestion structures at the API boundary.
Broader validation of legacy successful JSON and a shared error schema remain
separate follow-ups. The intentional white-on-coral contrast exception remains;
this feature does not claim complete WCAG AA compliance.

## Project structure

```text
apps/
  api/                 NestJS API and TMDB integration
    src/movies/        Movie endpoints and application logic
    src/persons/       Person endpoint, DTOs, and application logic
    src/integrations/  External provider integrations
    test/              API end-to-end tests
  web/                 React frontend
    src/components/    Search, filters, movie cards, and details
    src/pages/         Application pages
    src/util/          Frontend API client and utilities
packages/
  contracts/           Shared TypeScript API contracts
```
