# Movie Explorer

Movie Explorer is a React and NestJS app for browsing movies, series, and people with TMDB data.

## Screenshots

- [Home](docs/screenshots/home.png)
- [Movie details](docs/screenshots/details.png)

## Features

- Discover trending, recent, popular, and upcoming movies and series, plus
  popular people.
- Search movies, series, and people with keyboard-accessible autocomplete.
- Filter the regional Streaming feed by All, Movies, or Series. It shows available
  titles ranked by popularity, not provider catalog additions. Shared select
  controls support typing an option label before confirming with Enter.
- Browse and filter results, with shareable search and detail routes.
- Explore movie and series details, cast, photos, videos, watch providers, and optional IMDb ratings.
- Browse Favorites-based homepage recommendations with independent Popular fallback for Movies/Series, and Similar titles after detail-page Media.
- Save movies and series independently in Favorites, Watched and Watchlist in the guest Personal Library. Favorites means liked, Watched means already seen, and Watchlist means planned viewing; a title can belong to all three. Marking Watched does not remove Watchlist membership.
- Explore other movies in a TMDB collection on movie details, with collection duplicates removed from Similar titles.
- View person profiles and filmographies, plus season and episode details.
- Use the responsive photo viewer with zoom, pan, and fullscreen controls.

The guest Library uses browser localStorage (`movie-explorer.personal-library`,
schema v3), with separate `movie:id` and `tv:id` identities and compact metadata.
Open `/library?collection=watchlist` for planned titles. Older v1/v2 data is
migrated with a backup before writing; existing Favorites and Watched are retained.
Storage failures show a warning while actions continue in memory. There is no
cross-tab or cloud synchronization; clearing browser storage removes local data.

## Tech stack

- React 19, TypeScript 6, React Router, and SCSS
- NestJS 11, TMDB and optional OMDb integrations
- npm Workspaces and Vite+ task orchestration
- Vitest and React Testing Library; Jest for the API
- Oxlint, ESLint, Stylelint, and TypeScript checks; Vite+/Oxfmt formats web
  and API files with workspace-specific options

## Getting started

Use Node.js 24 and npm 11.6.2. From the repository root:

```sh
npm ci
cp apps/api/.env.example apps/api/.env
```

Set `TMDB_ACCESS_TOKEN` in `apps/api/.env`. `OMDB_API_KEY` is optional and enables IMDb ratings. The frontend defaults to `http://localhost:4000` in development and same-origin `/api/v1` requests in production; set `VITE_API_BASE_URL` in `apps/web/.env` to use another API address.

Start both apps with `npm run dev`. The web app runs at [http://localhost:5173](http://localhost:5173), the API at [http://localhost:4000](http://localhost:4000), and Swagger UI at [http://localhost:4000/api-docs](http://localhost:4000/api-docs).

## Localization and guest preferences

The header's globe control selects English (`en-US`) or Hungarian (`hu-HU`)
and an independent streaming region. New visitors start with English and the
US region; browser language, IP address, and location do not select defaults.
Changing either preference applies immediately without a page reload or route
change. The compact region selector offers thirteen common markets, including
the US and Hungary, and also displays any valid restored region.

### Translation resources and formatting

i18next and react-i18next load static JSON resources from
`apps/web/src/locales/en.json` and `hu.json`. Resources are bundled with the
frontend, initialize before rendering, and work with lazy React Router routes.
There is no runtime translation service or translation API. Hungarian copy is
a development draft available for language review.

Keys are grouped under navigation, actions, loading, UI, messages, genres,
media types, statuses, and settings. TypeScript checks keys against the English
resource. Use `useTranslation()` for reactive components, named `{{values}}`
for interpolation, and `count` with `_one`/`_other` keys for plurals. Automated
tests require matching English/Hungarian leaf keys and interpolation parameters.
The current catalogs contain 514 keys each, including accessible labels and
dynamic status messages.
Missing or empty Hungarian values fall back to English. Dates, numbers,
ratings, currency, language names, and region names use locale-aware `Intl`
formatting; source values, currency codes, and URL filter identifiers remain
unchanged. CSS overlay copy also comes from the JSON resources.

Intentional untranslated content includes Movie Explorer and provider brands,
people/title names, user search text, saved Library metadata snapshots, license
identifiers, language endonyms (English/Magyar), and technical identifiers.
TMDB job, department, character, organization and place names remain provider
data where that endpoint does not supply localized values. Static HTML/social
metadata and the favicon's brand description remain English. These are not
missing Hungarian application UI keys.

### API localization and fallback

The canonical content locale is the optional, validated `language` query
parameter on application API requests. Only `en-US` and `hu-HU` are accepted;
omitting it uses `en-US`. `watchRegion` is an independent uppercase two-letter
market code and defaults to `US`. Swagger documents both parameters. Browser
`Accept-Language` headers remain compatible and do not override preferences.

```text
GET /api/v1/movies/550?language=hu-HU&watchRegion=US
GET /api/v1/series/1396?language=en-US&watchRegion=HU
GET /api/v1/discover/providers?language=hu-HU&region=US
```

Streaming Discovery retains its existing explicit `region` parameter (and its
legacy API default of `HU`) for consumer compatibility. The frontend always
sends the selected market to those endpoints. Detail watch-provider responses
select `watchRegion`; language does not select the streaming market.

Nest's HTTP boundary validates preferences and uses Node `AsyncLocalStorage`
to isolate each asynchronous request without changing singleton provider
lifetimes. Applicable TMDB movie, series, season, episode, person, search,
discovery, recommendation and genre requests receive the selected language.
External-ID and per-title watch-provider endpoints are language-neutral.
Regional release and streaming queries use their endpoint-specific region
parameters. Images retain selected-language, English and language-neutral
variants; thumbnail and original-image URLs retain their existing behavior.

Empty/null Hungarian overview or biography fields can trigger **one** English
detail request within the remaining request-time budget. Only missing copy is
filled, with matching identities; valid Hungarian fields remain intact. A
season/series response can reuse that same fallback for embedded episodes or
seasons, without per-item requests. Fallback failure preserves the localized
response and existing nullability. Search/discovery/recommendation lists do
not fetch English details per result: missing list descriptions remain absent
until details are opened. All descriptions still come from TMDB.

Discovery, recommendation pools, collection responses and their in-flight
requests include locale/region in cache identity. Genre caches include language;
stable English genre filter identifiers are resolved independently of display
labels. External-ID caches stay shared. Frontend history/discovery caches
include preference identity, and preference changes cancel obsolete requests,
clear obsolete visible resource state, and reload affected resources through
the existing hooks. Pagination, URL filters and Back/Forward behavior remain
under React Router.

### Persistence, AWS and future accounts

The separate `movie-explorer.preferences.v1` localStorage key stores only
`{ "language": "en-US", "region": "US" }`. A small storage boundary validates
saved data and safely defaults when JSON, values, or storage access are invalid.
If saving fails, preferences still apply in memory and the settings panel
announces the limitation. Library keys and collection memberships are preserved.
Saved title snapshots retain their captured language until normal detail
refreshes update them; switching language does not fetch every Library item.

Preference state is independent of the localStorage adapter. Future optional
account storage can reuse the same shared contract; OAuth, databases, migration,
account synchronization and list merging are deferred.

Bundled resources need no Lambda filesystem writes, workers, authentication,
database, cloud service, or runtime translation calls. Existing CloudFront API
behaviors disable caching and forward query parameters through the same-origin
API Gateway/Nest Lambda route. No infrastructure or domain changes are required.

This SPA does not publish separately indexed language pages. Client-side titles
and detail metadata can change with preferences, while static HTML and initial
Open Graph remain English. Existing URLs have no language prefixes or hreflang
variants, so language-specific indexing and social previews are not guaranteed.
A future localized SEO design is separate from this phase; no SSR migration is
included.

### Localization verification

The completed milestone checks passed 1,161 frontend tests (101 files), 748 API
unit tests (45 suites), 351 API E2E tests (9 suites), 34 infrastructure tests,
and three Lambda artifact/smoke tests. Root lint, typecheck, coverage and
production build, readability validation, formatter stability, and whitespace
checks passed. The build retains a non-blocking warning for the approximately
551 KB minified main frontend chunk (169 KB gzip).

Headless Edge checks covered English/Hungarian selection, independent regions,
restoration after reload, preserved URL filters, Library navigation and browser
Back/Forward, at configured widths of 320, 360, 390, 768 and 1440 pixels. No
document overflow or JavaScript exceptions were observed. Browser API responses
were mocked; live TMDB content and manual assistive-technology checks were not
verified. Hungarian copy remains available for human language review. No AWS
deployment was performed.

## Development and verification

Run workspace tasks from the root:

```sh
npm run dev
npm run lint
npm run typecheck
npm test
npm run coverage
npm run build
npm run test:e2e
```

The API end-to-end suite uses a mocked provider and does not require TMDB credentials.

Use `npm run check:changed` during development and `npm run check:all` before
delivery. The full command runs the production dependency audit, lint,
typechecks, coverage (including infrastructure), builds and API E2E checks.
It stops at the first failure and reports stage durations.

Changed checks include staged, unstaged and untracked files. To include branch
commits, use `npm run check:changed -- --base origin/main`; `--dry-run` prints
the plan without running checks. Renames include both paths and deleted files
still select their workspace. An invalid or unavailable base, an unknown path,
or a package manifest change selects full verification. Shared contracts select
both apps through workspace dependencies. Otherwise, the complete affected
workspace lint, typecheck, coverage and build scripts run; API changes also
run E2E. No changes select no checks. Default detection compares against HEAD;
use an explicit base for committed branch work.

CI runs the full gates in three concurrent lanes: static checks and security,
coverage, and builds followed by E2E. The aggregate `Quality Gates` check
requires every lane to succeed. Husky retains its existing staged-file checks.

Frontend `lint` runs Oxlint, ESLint 9 Flat Config, TypeScript, an independent
Oxfmt check, and Stylelint for SCSS. Run individual checks with
`npm run <script> --workspace @movie-explorer/web`: `lint:oxlint`,
`lint:eslint`, `typecheck`, `format:check`, or `lint:styles`.
Use `format` to apply Oxfmt or `lint:fix` to apply the available lint and
formatting fixes, then rerun `lint`. CI runs the same combined lint task through
Vite+. The staged-file hook also formats web source and styles independently.

ESLint owns React, Hooks, accessibility, import boundaries and type-aware checks;
Oxlint owns the explicitly configured core and TypeScript syntax checks.
The API retains its separate
ESLint 8 configuration.

Type checking and declaration generation use TypeScript 6.0.3. Frontend
typechecks include both application source and the Vite configuration project.
Native Vite+ type-aware checking is available, but does not replace these
compiler checks or declaration builds.

## Agent development

See [agent engineering](docs/agent-engineering.md) for mandatory instruction
ownership, skill and workflow discovery, changed-file verification, test quality,
and measured CI practices. Git staging and commits remain manual.
