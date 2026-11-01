# Recommendation API foundation

`GET /api/v1/recommendations/:category` returns a new random selection from a
cached candidate pool. It is independent of the existing Discovery browsing
feeds. It does not personalize results or change the frontend.

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

The provider requests page 1, then pages 2–5 concurrently where page one's
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

Each request samples up to ten distinct titles using Fisher–Yates without
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
(default 8000ms), plus processing. A future UI can hit its browser deadline
before the shared load finishes; retry can then reuse the completed pool.
Repeated requests during partial outages refetch instead of caching degraded
data for 30 minutes. Existing retry/rate-limit presentation should be retained
when adding the UI.

DATA-01 retains the custom frontend hooks: transport/runtime validation and
pagination are already shared, while URL/history reveal state and independent
section recovery have distinct ownership. No measured request hotspot justified
a TanStack Query pilot or another custom cache layer in this backend milestone.
Router URL state, React local state, and Zustand/localStorage library persistence
remain independent. No frontend files or dependencies change.

REC-03–REC-08 remain deferred, including UI/client integration, carousel work,
refresh controls and cross-carousel overlap handling. The isolated sampling and
pool boundary support another selection without reimplementing retrieval.
