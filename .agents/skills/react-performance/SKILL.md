---
name: react-performance
description: Use when diagnosing or improving React rendering, responsiveness, or frontend runtime performance in apps/web; avoid speculative memoization and unrelated UI changes.
---

# React performance

Use for a concrete performance concern in `apps/web`, such as unnecessary
work during search/filter updates, slow rendering, or an evidenced interaction
regression. General component and behavior work belongs to
`react-development`; shared API changes belong to `api-contract-change`.

- Establish the relevant user-visible behavior and identify the source of
  repeated or expensive work before changing code. Prefer a small targeted
  fix over broad optimization.
- Preserve existing debounce, search, pagination, URL state, and loading
  behavior. Avoid duplicate derived state and unnecessary effects.
- Use memoization only when it addresses identified repeated work and remains
  correct as inputs change. Keep hook dependencies accurate and avoid stale
  closures.
- Verify that asynchronous work can be canceled or safely ignored when it is
  obsolete, and that timers, listeners, and other resources are cleaned up.
- Add or update focused tests for observable behavior when needed. Use
  `verify-change` to select repository checks; report any performance claim
  with the evidence used to assess it.

Use React's official [render and commit guide](https://react.dev/learn/render-and-commit)
and [memo reference](https://react.dev/reference/react/memo) as guidance; do
not add memoization solely because it is available. For investigation steps
and Vite-compatible examples, load [the React performance reference](references/react-performance.md).
