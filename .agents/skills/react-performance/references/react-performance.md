# React performance in Movie Explorer

Use this reference to investigate a concrete delay or unnecessary workload in
`apps/web`. Start with the user-visible action (typing a query, changing a
filter, opening details) and trace where time is spent before changing code.

## Avoid serial waits for independent work

If a screen needs independent resources, starting request B only after request
A resolves creates a network waterfall. Start independent operations
concurrently and wait for all of them together. Keep sequential awaits when a
later request genuinely needs an earlier response. Avoid adding calls just to
parallelize work that is not required for the screen.

```ts
const [movie, recommendations] = await Promise.all([
  getMovie(movieId),
  getRecommendations(movieId),
]);
```

This is a generic example: use the application's existing API service
boundary and application contracts when implementing real requests.

## Reduce unnecessary rendering before memoizing

State updates render the component that owns the state and its descendants.
Keep transient input state near the input where practical; keep shareable
search and filter values in the URL as the application already does. Calculate
cheap derived values during render. If expensive work runs before an early
loading or empty return, move that work below the condition or into a focused
child that only renders when needed.

Use React DevTools Profiler or browser performance tools to identify repeated
work. `memo`, `useMemo`, and `useCallback` have comparison and maintenance
costs: they help only when they skip meaningful work or preserve identity for
a consumer that depends on it. Measure before and after when the change is
performance-motivated, and keep dependencies complete. Do not memoize every
prop, callback, or list by default.

## Split code at useful loading boundaries

Dynamic imports can put an infrequently used, large screen or feature into a
separate chunk. In this Vite and React Router application, consider a route
boundary only when bundle inspection or loading measurements show that
deferring the code benefits the initial experience. A lazy component needs a
nearby `Suspense` fallback that keeps the page understandable while it loads.
Splitting tiny components adds requests and complexity without a practical
gain.

After a change, inspect the production build output and browser network panel
to confirm which code moved into a chunk and when it loads. Vite transpiles
TypeScript but does not type-check it, so use the repository's separate
typecheck command as selected by `verify-change`.

## Reuse requests deliberately

Request deduplication means identical in-flight or cached requests share a
result. First check whether the same UI branch is issuing the same request
more than once and whether an existing service or state owner can share it.
This repository's API utility centralizes HTTP calls but does not itself
provide a general response cache. Do not add a module-global promise map,
query library, or cache abstraction merely to deduplicate one request: cache
keys, cancellation, errors, pagination, and invalidation all need clear
ownership.

For search-driven requests, preserve the established debounce and pass an
`AbortSignal` where supported. Aborting obsolete work reduces wasted network
and state updates but is not request deduplication. Only combine requests
whose parameters and freshness requirements are actually equivalent.

## Sources and attribution

This reference contains original project-specific guidance and a small
illustrative example; no upstream code or skill wording was copied.

- React, [Render and Commit](https://react.dev/learn/render-and-commit),
  [memo](https://react.dev/reference/react/memo),
  [lazy](https://react.dev/reference/react/lazy), and
  [Suspense](https://react.dev/reference/react/Suspense).
- Vite, [Features: TypeScript](https://vite.dev/guide/features#typescript).
- Vercel Labs,
  [react-best-practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices),
  especially its guidance on independent async work, render costs, and bundle
  splitting. Its Next.js-specific examples are not treated as Vite patterns.
- Jeff Allan,
  [React performance reference](https://github.com/Jeffallan/claude-skills/blob/main/skills/react-expert/references/performance.md),
  reviewed for topic coverage; recommendations here remain evidence-driven.
