# Deployment baseline

This repository builds a static React SPA and a separate NestJS HTTP API. No
hosting provider is selected. These instructions prepare a release; they do not
deploy it.

## Build and runtime

Use Node.js 24 and npm 11.6.2, matching CI and the root package manager setting.
Install all workspace dependencies with `npm ci`, then run the root quality gates:

```sh
npm run lint
npm run typecheck
npm test
npm run coverage
npm run build
npm run test:e2e
git diff --check
```

Publish the contents of `apps/web/dist` to a static HTTPS host. Run the API from
the repository workspace using:

```sh
npm run start:prod --workspace @movie-explorer/api
```

The API runs `node dist/main` from `apps/api`. Retain its compiled output,
runtime workspace dependencies and the built `packages/contracts` workspace in
the runtime artifact. Build before pruning development dependencies. Vite preview
and the Nest watch server are local verification tools, not production servers.

## Environment

Set frontend variables **before building**. Rebuild when they change. Every
`VITE_*` variable is public; never place TMDB or OMDb credentials in one.

| Variable | Production value |
| --- | --- |
| `VITE_API_BASE_URL` | Public HTTPS API origin; empty or absent uses same-origin `/api/v1` in production |
| `VITE_SITE_URL` | Public frontend origin without a path, query or fragment; absent/empty makes a preview build noindex |
| `VITE_SOCIAL_IMAGE_URL` | Optional absolute public URL of an approved sharing image; omit until an asset is selected |

The development API default remains `http://localhost:4000`. Do not ship the
development example's localhost URL as the production API address.

Set API variables at runtime through the host's secret/environment mechanism:

| Variable | Behavior |
| --- | --- |
| `NODE_ENV` | Set to `production` |
| `PORT` | Integer 1–65535; default 4000 |
| `HOST` | Optional bind address, such as `0.0.0.0` for a container |
| `CORS_ORIGINS` | Comma-separated exact frontend origins, without trailing slashes; production defaults to no cross-origin access |
| `SWAGGER_ENABLED` | `true` or `false`; production defaults to false, development to true |
| `TMDB_ACCESS_TOKEN` | Required server-only secret |
| `TMDB_API_BASE_URL` | Normally `https://api.themoviedb.org/3` |
| `TMDB_IMAGE_BASE_URL` | Normally `https://image.tmdb.org/t/p/w500` |
| `TMDB_LANGUAGE`, `TMDB_REGION` | Optional provider locale and region settings |
| `TMDB_REQUEST_TIMEOUT_MS` | 1–60000 ms; default 8000 |
| `OMDB_API_KEY` | Optional server-only secret; IMDb ratings have existing unavailable states without it |
| `OMDB_API_URL` | Normally `https://www.omdbapi.com/` |

Do not copy local `.env` files into release artifacts. The API supports local
environment files for development; injected process variables take precedence.
Keep the configured external API origins trusted and HTTPS in production.

## Routing and connectivity

Serve existing static assets, `robots.txt` and `sitemap.xml` as real files before
SPA fallback. Unknown asset paths must return 404, not the HTML document.
Deep links such as `/movie/27205`, `/series/1396/seasons/1` and `/person/6193`
must load the SPA document. Client `/tv/...` aliases redirect to `/series/...`;
prefer permanent HTTP redirects for those aliases at the chosen host.

For same-origin hosting, proxy `/api/v1/*` to Nest before the SPA fallback.
Route the infrastructure health probe directly to the API's `/health`.
For separate origins, configure `VITE_API_BASE_URL` and `CORS_ORIGINS` together.
Check connectivity from a browser at the final HTTPS frontend origin, including
preflight requests and `Retry-After` visibility.

`GET /health` returns `200 {"status":"ok"}` once the API is serving requests.
It does not query TMDB/OMDb, expose credentials, or guarantee provider health.
Monitor provider errors separately. Swagger UI and `/api-docs-json` are absent
in production unless explicitly enabled; restrict access at the edge if enabled.

## SEO delivery and limitations

The application uses `BrowserRouter` with client-side requests and lazy detail
routes. It has no server-rendering entry point or finite entity manifest.
The build adds generic site Open Graph and Twitter metadata to the shared HTML;
it deliberately omits a shared canonical and `og:url`, which would misidentify
deep links as the homepage. An optional configured sharing image is included in
that initial HTML. No image, release date or rating is fabricated.

Loaded movie, series and person pages update title, description, canonical,
Open Graph, Twitter and JSON-LD using application-owned contracts, without extra
API requests. JSON-LD uses `Movie`, `TVSeries`, `Person` and homepage `WebSite`.
These are descriptive types, not a claim of eligibility for rich results.
Seasons and episodes retain their existing titles and remain noindex in this
baseline. Query variants, search, library, loading, error and not-found states
are noindex in the rendered document. Canonical entity URLs omit queries.

Client metadata is **not reliable dynamic social-card delivery**. Crawlers that
do not execute JavaScript receive generic site metadata. A static SPA fallback
also returns HTTP 200 for unknown entity/route URLs. Before public release, the
selected host must provide:

- Initial-response `X-Robots-Tag: noindex, follow` for search, library and
  unnecessary query/filter/pagination URLs. Do not block these in robots.txt;
  crawlers need to read the noindex directive.
- HTTP 404/410 for nonexistent resources and 5xx for temporary server failures,
  where a renderer or routing layer can determine the correct status.
- A metadata rendering entry point for entity-specific social cards, or a finite
  prerendered entity set with a refresh and deletion policy. Use the application
  API, keep provider credentials server-side, escape metadata, and serve the
  same representation to users and crawlers. Do not add bot-only content.

No framework migration or speculative rendering server is included. Build-time
entity prerendering is deferred until the indexed catalog and refresh policy
are defined; the live discovery feeds and unbounded detail catalog cannot be
represented reliably by a guessed list of IDs.

With `VITE_SITE_URL`, the build emits an absolute, homepage-only `sitemap.xml`
and robots.txt allowing crawling and advertising that sitemap. It excludes
queries, private browser library state and unverified entities, and invents no
`lastmod` values. Add verified entity URLs only when the rendering/indexing
strategy supports them. Without `VITE_SITE_URL`, no sitemap is emitted,
robots.txt disallows crawling, and initial HTML is noindex. Also protect preview
environments at the host; robots directives are not access control.

Google documents the distinction between initial HTML, JavaScript rendering,
canonicals and noindex in its [JavaScript SEO guide](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).
Open Graph fields follow the [Open Graph protocol](https://ogp.me/).

## Security, caching and release operations

The lockfile updates body-parser to 2.4.0 and qs to 6.17.1 to address
GHSA-27r3-jxmh-p828 and GHSA-6pq8-jhm2-2vcw. Review the production dependency
audit before release. Nest's pinned multer 2.4.0 and Swagger's pinned js-yaml
5.3.0 still have advisories (GHSA-q7qp-rjg7-q26m and GHSA-r3ph-w7gj-g6xm).
There are no upload endpoints in this application, and Swagger is disabled in
production by default, but these facts do not constitute a clean dependency
audit. Resolve the remaining upstream dependency pins in a separately reviewed
dependency change before declaring the release security gate clear. Do not run
an unreviewed `npm audit fix --force` framework major upgrade.

Terminate TLS at the chosen host and redirect HTTP to HTTPS. The API removes
`X-Powered-By` and sends `nosniff` and `X-Robots-Tag: noindex` on API responses.
CORS controls browser access, not authentication or abuse. There is no inbound
application rate limiter: configure edge rate/concurrency limits for API traffic
and monitor TMDB/OMDb quotas before exposing the service publicly. Provider 429
handling and frontend request cancellation already exist. Do not enable proxy
trust globally without understanding the host's trusted proxy chain.

Choose frontend security headers at the host. A CSP must account for the actual
Google Fonts, TMDB images, API origin and YouTube embeds; verify it in report-only
mode first so existing galleries and videos continue to work. Do not invent a
restrictive policy without testing these integrations.

Cache fingerprinted assets for a long duration with `immutable`; revalidate HTML,
robots and sitemaps so releases and indexing changes propagate. Avoid caching
API errors as successful responses. Keep the previous artifact and environment
configuration available for rollback. After rollout, smoke-test deep links,
health, search, details, provider/rating fallbacks and headers from the public
origin. Validate social-card fetching and structured data against the actual
public responses. No deployment or cloud resources are created by these steps.

Outstanding decisions: frontend/API domains and host, same-origin proxy versus
separate origins, rendering/prerendering and catalog refresh policy, sharing
image, edge rate limits, TLS/security headers, monitoring and rollback ownership.
