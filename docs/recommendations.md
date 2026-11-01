# Recommendations

`GET /api/v1/recommendations/:category` returns a new random selection from a
cached candidate pool. It is independent of the existing Discovery browsing
feeds. The homepage presents these selections in four horizontal rows. Results
are not personalized.

| Category | Source | Title mediaType |
| --- | --- | --- |
| `popular-movies` | [TMDB popular movies](https://developer.themoviedb.org/reference/movie-popular-list) | `movie` |
| `top-rated-movies` | [TMDB top rated movies](https://developer.themoviedb.org/reference/movie-top-rated-list) | `movie` |
| `popular-series` | [TMDB popular series](https://developer.themoviedb.org/reference/tv-series-popular-list) | `tv` |
| `top-rated-series` | [TMDB top rated series](https://developer.themoviedb.org/reference/tv-series-top-rated-list) | `tv` |

No query parameters are supported; unknown categories and query keys return 400.
Language and region use the existing server-side `TMDB_LANGUAGE` and
`TMDB_REGION` configuration, not client input. No new credentials are needed.

The shared application-owned `RecommendationResponse` contains:

```json
{
  "category": "popular-movies",
  "results": [{ "mediaType": "movie", "id": 550, "title": "Fight Club" }],
  "availability": "available",
  "candidateCount": 1
}
```

`results` reuses the movie/series variants of the existing `SearchResult` card
contract, including optional poster, date, backdrop, description and rating
metadata. Stable identity remains `mediaType:id`. Series use the established
wire discriminator `tv`. Swagger documents this discriminated union, limits,
parameters, availability and 400/429/502/504 responses.

## Retrieval and failures

The provider requests page 1, then pages 2â€“5 concurrently where page one's
`totalPages` permits. It preserves source rank before sampling, validates page
envelopes/identity, skips invalid or adult rows through the existing mapper,
deduplicates by identity and retains at most 100 candidates. It never fetches
extra pages to fill gaps. Missing optional images/dates do not invalidate a
title. A smaller pool is normal, including zero.

`candidateCount` is the actual valid unique pool size, not an upstream total.
`available` includes a successfully retrieved empty source. If page 1 fails,
the API preserves the classified error because later page bounds are unknown.
If later pages fail but usable candidates exist, the API returns 200 with
`availability: "partial"`. Partial pools are not cached, so a later request can
recover immediately. If failed pages leave no usable candidates, an error is
returned rather than an apparently successful empty result.

Existing transport timeouts and sanitized logs remain in use: upstream rate
limits return 429 with safe `Retry-After`, network/malformed/404/5xx failures
return 502, and deadlines return 504. Those HTTP errors apply when a request
cannot yield usable data; partial responses expose availability without raw
upstream errors. There are no automatic retries.

## Cache and selection

Complete candidate pools are cached for **30 minutes**, balancing reuse of five
requests with ranking freshness. There are **four entries / at most 400 title
records** per provider instance, keyed by category and configured language and
region. Locale configuration is fixed for that instance. Cache entries expire
on access; opportunistic pruning and FIFO capacity eviction bound retention
without background timers. Idle expired entries can remain until next activity,
within the same four-entry limit. Concurrent same-category loads share a promise;
failed, partial and settled promises do not leak into later retries.

Each request samples up to ten distinct titles using Fisherâ€“Yates without
replacement on a copy of the pool. Sampling does not change cached ordering or
refetch pages. Empty and undersized pools work naturally. Separate selections
may overlap or even match; there is no cross-category exclusion or seed API.
Random sampled responses send `Cache-Control: no-store`, so browser/CDN caching
does not freeze a selection. Any future CDN pool caching should use an explicitly
deterministic resource and a separately reviewed cache policy.

## Runtime and frontend ownership

Warm Lambda invocations can reuse in-memory pools; cold starts and separate
execution environments have independent caches. There is no global consistency
or durable persistence. Client disconnects leave the shared, deadline-bounded
load running so other clients can finish and the cache can warm. No bootstrap,
packaging, deployment or infrastructure changes are required.

A cold load takes two upstream rounds, each bounded by `TMDB_REQUEST_TIMEOUT_MS`
(default 8000ms), plus processing. Only homepage recommendation requests use a
25-second browser deadline; the normal 12-second API deadline remains unchanged.
The browser starts at most two category requests at once. Queued requests cancel
without fetching, and active requests propagate the caller AbortSignal. Requests
begin within 600px of the viewport, so visible rows start promptly without eagerly
loading all below-the-fold content. Successful mounted rows do not refetch on
ordinary rerenders. There are no automatic retries or browser candidate caches.

The longer deadline covers two default upstream rounds with cold-start headroom;
it does not guarantee success for unusually slow cold starts, elevated configured
provider deadlines, gateway limits, or sustained outages. A client timeout leaves
the shared backend load warming its instance-local pool; manual retry may reuse
that completed pool. Partial outages still refetch uncached degraded pools.

DATA-01 retains the custom frontend hooks. Router URL state, local scroll state,
and Zustand/localStorage library persistence keep their existing ownership. No
TanStack Query, dependencies, or cloud infrastructure were introduced.

## Movie and Series detail titles

| Application route | Official upstream reference |
| --- | --- |
| `GET /api/v1/movies/:id/similar` | [Movie Similar](https://developer.themoviedb.org/reference/movie-similar) |
| `GET /api/v1/movies/:id/recommendations` | [Movie Recommendations](https://developer.themoviedb.org/reference/movie-recommendations) |
| `GET /api/v1/series/:id/similar` | [Series Similar](https://developer.themoviedb.org/reference/tv-series-similar) |
| `GET /api/v1/series/:id/recommendations` | [Series Recommendations](https://developer.themoviedb.org/reference/tv-series-recommendations) |

These routes use the existing Movies and Series resource groups. IDs must be
positive decimal safe integers; invalid IDs return 400 before provider work.
Series integration uses TMDB's `tv` path internally. There are no new `/api/v1/tv`
aliases. Each route retrieves only page 1 in the configured language, preserves
source ranking, excludes adult entries and the current title, deduplicates by
identity, and returns at most ten titles. No extra pages, title lookups, homepage
pool sampling, or additional provider requests fill gaps.

```json
{
  "results": [{ "mediaType": "tv", "id": 1399, "title": "Series" }],
  "availability": "available"
}
```

`RelatedTitlesResponse` reuses `RecommendationTitle`, including optional image,
date, description and rating fields. It has no provider pagination or pool count.
Missing images remain valid optional metadata. An available empty source returns
200 with an empty array. Malformed entries are omitted with `partial` availability
if any valid source titles remain; wholly malformed entries or an invalid page
envelope return 502. Intentional adult/current/duplicate exclusions do not make a
valid response partial. A source 404 returns 404; connection/authentication/5xx
failures return sanitized 502, rate limits return 429 with safe `Retry-After`,
and provider deadlines return 504. Swagger documents those responses and the
existing movie/series summary schemas. Credentials and raw provider shapes never
appear in the application response.

## Presentation and recovery

Homepage has one **Recommendations** section after Movies, Series and Streaming,
with a compass icon and **Movies** / **Series** tabs using the existing homepage
header styles. Movies is selected by default. Exactly one horizontal row is
visible, backed by `popular-movies` or `popular-series`; Top Rated stays available
in the API for future consumers. Tabs support Left/Right, Home/End and native
keyboard activation with a single tab stop. Panels mount on first visit and remain
hidden when inactive, retaining results, pending/error state and scroll position.
Returning does not refetch; explicit retry affects only its row. In-flight work
can finish while hidden; page unmount cancels it. Unvisited tabs do not fetch.
Movie and Series details show only **Similar Movies/Series** directly after Media.
They do not request individual recommendation endpoints. Those public endpoints
remain available. Other detail sections retain their relative order.

All homepage and detail rows reuse `RecommendationRow`, `SearchResultCard`, lazy-loading
posters and library actions. Series cards use the existing canonical frontend
`/series/:id` route; `/tv/:id` remains its existing redirect. The shared row reuses
Streaming's five-column desktop card sizing and gaps, two cards below 1024px and
one below 768px. Recommendation rows stay horizontal at every width. Streaming's
existing desktop grid, tabs and load-more behavior remain unchanged. Because its
presentation was not an all-width carousel, it was not extracted or reorganized.
Arrow buttons reuse the existing lightbox/featured control styles.

Each row distinguishes deferred/loading, available-empty, partial, failed and
poster-filtered-empty states. Missing/blank poster URLs and duplicate identities
are excluded locally without replacement fetches. Partial results stay visible
and explicitly marked; failed retries preserve usable data. Retry affects only
its row and respects safe rate-limit delays. Aborted requests do not display an
error. Source-keyed rows and AbortSignal checks prevent stale results after route
changes. Native touch/trackpad overflow and keyboard-accessible buttons and card
links preserve navigation. Reduced-motion preferences disable smooth arrow scroll and control transitions.

REC-03 through REC-07 cover these consumers, documentation and tests. REC-08
refresh controls, cross-carousel duplicate suppression, personalization and
additional infrastructure remain deferred.
