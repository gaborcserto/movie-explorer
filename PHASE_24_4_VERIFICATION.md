# Phase 24.4 verification

Verified 2026-10-18. Initial working tree was clean. No staging, commit,
reset, revert, dependency installation, or push was performed.

## Verification matrix

Automated coverage below means the named existing suites were inspected and
executed, with focused regressions added only for the defects described below.
Browser API responses were deterministic fixtures; no TMDB requests were made
by the automated verification. Browser fixture code was temporary.

| Scenario | Expected behavior | Automated coverage | Browser verification / observed result | Severity |
| --- | --- | --- | --- | --- |
| Wildcard 404 | One main and meaningful h1; title, initial focus, safe Search link | Error page, App, shared presentation | Passed in Air and Edge; no duplicate main, overflow, or clipped actions | None found |
| Fatal render exception | Sanitized fallback; logging; Reload and native Search without Router | Error Boundary | Separate React fixture outside Router; one main/h1, main focused, log retained; both recovery actions activated successfully, no loop or 500 label | None found |
| Popcorn | Coral, decorative, nonfocusable, responsive, finite motion | Presentation and compiled-style tests | RGB(246,82,97); aria-hidden and focusable=false; computed durations 300/1400/1800/2200ms, one iteration; actual reduced-motion emulation disables every animation with visible static art | None found |
| Movie details | Success; invalid ID makes no request; contextual missing; recoverable failures and guarded Retry | Detail ID, API client, classifier, details, detail recovery | Success, invalid ID/no request, 404/no Retry, network, 429/90s guidance, 500/502/503/504, malformed JSON; repeated failure to success and pending navigation passed | None found |
| Person details | Equivalent recovery; biography, filmography and local state preserved | Person page, age, filmography, detail recovery, media suites | Success/error matrix passed; Person selected through HeaderSearch; error recovery uses shared infrastructure; successful rich biography/filmography/media behavior covered by existing tests | None found |
| Initial Movies/People search | Classified failure; guarded Retry; usable keyboard recovery | List, search results, API client/classifier; two new integration cases | Successful Retry previously left focus on BODY; now keeps pending focus and restores MAIN on success | Medium, fixed |
| Inline announcements | Error and loading feedback announced independently | New integration assertions | Nested status inside alert was present in DOM; now separate regions, with action label updates outside the alert | Low, fixed; no screen-reader speech claim |
| Pagination | Retain cards, retry same page, deduplicate, reveal at most ten additional unique cards | List and search results cover sparse pages, duplicates, provider limit, cancellation and rapid filter/query changes | Both views retained 20 cards after page failure, then revealed 30 on successful retry; no overflow or stuck loading observed | None found |
| Search history | Preserve query/view/filters, loaded depth and scroll; safe Back/Forward | Existing history journeys plus strengthened clamp regression and two new unscrolled-entry cases | Movie and Person filter/depth/scroll journeys passed after fix; Person on 320x320 previously restored 280px instead of 640px | Medium, fixed |
| Autocomplete | Grouped suggestions, keyboard selection, dismiss, cancellation, stale suppression, visible failure and Enter search | 25 autocomplete cases plus Search/HeaderSearch suites | Air selected Movie and Person via arrows/Enter; Edge checked active descendant, Escape/outside dismissal without reopening, Home/Header failure feedback and Enter search | None found |
| Backend boundary | Public 400/404/429/502/504, sanitization, safe Retry-After, finite deadline, no retries | 145 unit tests and 38 mocked e2e tests | Automated provider/HTTP checks; no live provider traffic | None found |
| Responsive and accessibility | Flowing layout, reachable controls, meaningful semantics, visible focus, enlarged text | Style/component suites | Actual Edge viewports and accessibility-tree inspection; details below | Intentional contrast exception remains |
| Remote font | Identify context; avoid preview-only typography changes | Source and production CSS inspected | Air CORS failure; standalone Edge loads Montserrat successfully; direct host request returns 200 and wildcard CORS | Preview limitation, no application fix |

## Confirmed defects and focused fixes

1. **Successful initial Retry lost keyboard focus.** Removing the focused
   inline Retry button sent focus to BODY. The shared inline error component
   now restores the Search main when its focused button unmounts. Search main
   accepts programmatic focus through tabindex=-1. Failed/pending Retry keeps
   its existing button and focus. Two Movies/People regressions cover this.
2. **Search scroll was overwritten during departure.** In an actual 320x320
   Edge Person journey, outgoing layout cleanup read 280px after the shorter
   destination had clamped a previously saved 640px position. Cleanup no longer
   rereads the destination's scroll. The cache initializes the unscrolled
   position, updates from active Search scroll events, and captures click, submit
   and browser-history departures before routing changes the layout. This also
   covers position changes whose scroll event has not arrived yet. The existing pair
   of history tests failed with 280 versus 640 before the fix, then passed.
   Two added cases protect unscrolled Search entries after detail scrolling.
3. **Nested inline live regions.** Loading status was inside an assertive
   error region, alongside the changing action text. Error copy, loading
   status and action now have separate announcement boundaries. This removes
   the structural duplication risk; actual assistive-technology speech was
   not measured.

Files changed:

- [error.tsx](air-file://kl1kkar98c1q55gofujj/work/git/movie-explorer/apps/web/src/layouts/error/error.tsx?type=file&root=E%3A)
- [homePage.tsx](air-file://kl1kkar98c1q55gofujj/work/git/movie-explorer/apps/web/src/pages/homePage.tsx?type=file&root=E%3A)
- [useSearchHistory.ts](air-file://kl1kkar98c1q55gofujj/work/git/movie-explorer/apps/web/src/components/list/useSearchHistory.ts?type=file&root=E%3A)
- [detailRecovery.test.tsx](air-file://kl1kkar98c1q55gofujj/work/git/movie-explorer/apps/web/src/components/details/detailRecovery.test.tsx?type=file&root=E%3A)
- This report.

## Verification results

- Frontend: **397/397 tests, 40 files**; coverage statements 95.68%, branches
  91.18%, functions 97.61%, lines 96.91%. Four added cases and two strengthened
  history cases. Existing behavior suites remain intact.
- API: **145/145 unit tests, 11 suites**, coverage executed; **38/38 e2e
  tests, one suite**, mocked provider. Safe diagnostic logging, 8-second
  default/configuration bounds, body-read deadline and failure mappings pass.
- Root lint, typecheck, coverage, production build and e2e commands passed.
  Vite Task reused unchanged API/contracts caches on some root commands;
  API lint, typecheck, build and coverage also ran directly in this session.
- After the final frontend implementation change, frontend lint (Oxlint,
  ESLint, TypeScript, Stylelint), coverage tests and production build ran again
  successfully. Focused recovery/history checks passed 25/25.
- Final diff review and git diff --check passed.
- Expected failing regression run: two history assertions reproduced the
  280px overwrite before its fix. An early new test queried multiple status
  regions ambiguously; its query was corrected before the final passing run.
  Temporary browser harness attempts also needed visibility, keyboard-event
  and page-readiness corrections; those were harness issues, not app defects.

## Browser, accessibility and responsive findings

Used the Air preview at its actual 1067x1206 viewport, then installed
headless **Microsoft Edge 155.0.4283.45** through its debugging protocol.
No browser automation dependency was added. The application ran at
[localhost:5173](http://localhost:5173).

The standalone run includes **35 behavior checks and 42 viewport checks**.
Ten further repeated short-viewport Movie/Person history journeys passed,
including departure before a scroll event and Back/Forward restoration.
Actual top-level viewport sizes were 320x568, 390x844, 768x1024, 1024x768,
1440x900 and 320x320. The viewport matrix covered 404, fatal fallback,
Movie/Person contextual failures, both pagination failures and expanded
HeaderSearch failure feedback. No horizontal overflow was measured. Error
recovery actions were at least 44px high, wrapped inside the available width,
and remained scrollable on short screens; no body scroll lock was present.
A long contextual message at 320x320 with explicitly doubled heading,
paragraph and action text stayed within horizontal bounds and kept actions
reachable by scrolling. Earlier iframe checks gave matching layout results.

Landmarks, heading names, title/focus behavior, combobox state and decorative
SVG semantics were inspected in DOM and the browser accessibility tree.
Keyboard selection/dismissal and Retry recovery were exercised. Errors convey
meaning in text, independently of color. Existing visible-focus styles remain.
The SVG has a reserved viewBox/aspect ratio and no external resources;
geometry and animation rules were inspected, not a full CLS performance audit.
Actual prefers-reduced-motion emulation returned animation:none and opacity:1
for the illustration, bucket and kernels immediately after navigation. No
content waits for animation completion.

**Intentional exception:** white on coral #f65261 is approximately 3.34:1,
below 4.5:1 for normal text. The palette was preserved. These checks do not
establish full WCAG 2.2 AA compliance. No actual screen reader was used.

## Font investigation

Air failed to load
[Montserrat WOFF2](https://fonts.gstatic.com/s/montserrat/v31/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2)
from origin [localhost:5173](http://localhost:5173). Its exact diagnostic was
that request header field cache-control was not allowed by
Access-Control-Allow-Headers in the preflight response.

The app imports Google's Montserrat CSS with display=swap. The production
CSS retains that same Google Fonts import; it does not embed the WOFF2 URL
or add a custom font-fetch header. A direct host HEAD request with the local
Origin returned HTTP 200 and Access-Control-Allow-Origin: *. Standalone Edge
loaded Montserrat, recorded successful Google font responses and no network
failures. Forced Arial fallback at 320px produced no horizontal overflow.
These observations support a preview-specific request/header issue. They do
not verify an actual production deployment. No fonts, dependencies or global
colors were changed.

## Limits, deferred work and recommendation

- Native mobile keyboard/visual-viewport behavior, physical devices, other
  browser engines, actual screen-reader announcements and native browser zoom
  were not verified. The short viewport and explicit 200% text checks are
  approximations for those conditions.
- Rich successful Person media, filmography selection/sorting/Load More and
  other lightbox flows passed existing automated tests; they were not all
  manually replayed with populated fixtures in this audit.
- Cache lifetime and its 30-entry bounds were verified by source inspection;
  browser eviction after 31 entries was not exercised.
- Frontend malformed-JSON detection is tested. Comprehensive runtime
  validation of syntactically valid JSON contract shapes remains deferred;
  consider Phase 24.3C if that boundary is expanded. No public API contract
  change was required here. Partial details and partial autocomplete groups
  remain outside scope.
- Caller abort versus timeout is verified at the browser API boundary.
  The current backend provider has no caller AbortSignal contract; client
  disconnect propagation was not added or claimed as verified.

**Recommendation:** Phase 24 can close for the implemented error/recovery
scope, with the intentional contrast exception and manual/device verification
limits explicitly recorded. This is not a complete accessibility certification.
No remaining reproducible Phase 24 defect was found in the tested scope.
