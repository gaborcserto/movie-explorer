# Recommendations

`GET /api/v1/recommendations/:category` returns a new random selection from a
cached candidate pool. It is independent of Discovery browsing feeds. The homepage
has one Recommendations section with Movies/Series tabs (Movies by default),
one horizontal carousel, and Favorites-based personalization when possible.
The four public GET categories remain available with their original behavior.

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
may overlap or even match; public GET categories have no preference payload or cross-category exclusion.
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
visible, personalized from Favorites where possible with `popular-movies` or
`popular-series` fallback; Top Rated stays available
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

REC-08 adds Favorites-based personalization as described below. Refresh controls,
cross-carousel duplicate suppression, advanced discovery and additional
infrastructure remain deferred.


## REC-08: Favorites-based homepage recommendations

`POST /api/v1/recommendations/personalized` accepts only:

```json
{ "mediaType": "movie", "favoriteIds": [12, 98, 400], "excludedIds": [12, 98, 400, 22] }
```

- `mediaType` is `movie` or `tv`; IDs belong only to that media type.
- `favoriteIds` contains zero to three distinct positive safe integers.
- `excludedIds` contains zero to 1,000 distinct positive safe integers for Favorites
  and Watched. Seeds are excluded implicitly. Watchlist is eligible and never a seed.
- Missing arrays, duplicate/invalid IDs, oversized arrays, unknown body fields and
  all query parameters return 400. No library snapshots, titles, user identities,
  cookies or localStorage objects are sent. Payload size also inherits the server's
  standard JSON body limit. Preferences are neither persisted nor logged.

The response reuses application-owned card summaries:

```json
{
  "mediaType": "movie",
  "results": [{ "mediaType": "movie", "id": 50, "title": "Example", "posterUrl": "https://example.com/poster.jpg" }],
  "availability": "available",
  "source": "favorites"
}
```

`source` is `favorites` (all returned titles are personalized), `mixed` (personalized
plus Popular fill), or `popular` (Popular only). `partial` availability means any
attempted Similar or Popular source failed or returned malformed entries, even
when ten cards can be returned. Successful empty/exhausted pools may return fewer
than ten, including zero. When upstream failures leave no eligible results, the
original classified 404/429/502/504 error is preserved; there is no empty-success
substitution. The existing GET routes and detail Similar behavior are unchanged.
The POST response uses `Cache-Control: private, no-store` and the browser requests
`cache: no-store`. There is no shared final-response cache.

### Selection, ranking and bounds

For each media type independently, sort all local Favorites by numeric ID. Choose
up to three spread-out entries: indices `floor(i * (n - 1) / (k - 1))`, where
`k = min(3, n)`; for one Favorite use index zero. This is deterministic, independent
of insertion/arrival order, spans the collection and avoids relying on the newest
Favorite. The API processes at most three seeds, sorted before retrieval.

Each seed uses the same integration-private first-page Similar mapper as the
Movie/Series providers. It returns at most ten application summaries per seed;
no extra Recommendations calls are justified for this first version. At most
30 personalized candidates are examined. Exclude seed/Favorites/Watched IDs,
wrong media types, invalid IDs/titles and missing/blank posters. Deduplicate each
seed before counting overlap. Rank by descending number of distinct seeds,
ascending mean source position, then ascending numeric ID. Mean source position
also interleaves equal-overlap candidates across seeds where possible; no result
wins because its network response finished first.

If fewer than ten survive, obtain the selected media type's existing Popular
pool once, apply the same eligibility rules and deduplicate against personalized
titles. Sample without replacement with the existing Fisher-Yates function and
append only the remaining slots. There is no refill loop or extra Popular page.
A failed seed does not discard other seeds; a failed fallback preserves usable
personalized results. Partial data is never cached as a complete result.

Per request: at most three concurrent Similar calls (one page each), then at most
five Popular calls (page 1 followed by up to four parallel pages). Maximum eight
TMDB requests, peak concurrency four, no automatic retries. Similar has a 6-second
ceiling, or the configured TMDB deadline if lower. Default cold execution is
bounded by 6 + 2 * 8 = 22 seconds plus processing; warm Popular fallback is cheaper.
The existing 25-second homepage browser deadline and 12-second global deadline
are unchanged. Elevated server deadlines/cold starts can still exceed the browser
budget. Cancellation releases browser work and prevents obsolete UI writes;
existing shared, timeout-bounded Popular work may continue to warm the cache.

The four-category Popular cache remains unchanged: 30-minute TTL, four-entry
capacity, concurrent-load deduplication, no partial/error caching. No per-title
Similar cache was added: bounded first-page calls keep this phase small and avoid
another cache/privacy/cancellation ownership layer. Repeated explicit retries
can therefore repeat seed calls. Lambda memory is instance-local and disposable;
no infrastructure, credentials, packaging or cloud resources change.

### Frontend state and large libraries

Homepage selectors derive sorted ID signatures per media type from the existing
Zustand library. Watchlist-only and title/poster snapshot edits do not invalidate
recommendations. Favorite or Watched membership changes replace only the affected
row, cancel old work and clear obsolete data/errors. Visited tabs remain mounted;
unchanged results and scroll position survive tab switches without refetching.
The homepage subscribes to library-key/clear storage events and rehydrates through
the existing validated persist middleware, with listener cleanup on unmount.

A completely empty preference set retains the existing GET flow. Watched-only
preferences use POST with no seeds for filtered Popular. Removing the final
Favorite restores Popular (using POST while Watched exclusions remain).
For libraries over 1,000 excluded IDs, the request sends only the first 1,000
sorted IDs; seeds are always excluded implicitly. The browser filters returned
cards against the complete local exclusion set. This may show fewer than ten
cards without further refills; it never exposes an excluded title. The complete
local library remains in the browser. The carousel, Streaming presentation,
detail Similar sections, card actions and routing are preserved.
