# Phase 22.5.3 verification

Verified on 2026-10-17. Phase 22.5.x is ready for one commit within the
browser coverage described below. No commit or push was performed.

## Baseline

Preserved the 22 existing uncommitted files. Reviewed their complete diff,
the detail pages and neighboring styles, and the existing regression tests.
No separate Phase 22.5 audit document was found in the repository; the
earlier fixes were checked against the current implementation and tests.

Confirmed the earlier fixes: one main landmark containing each page's hero
and lower content; navigation outside main; route focus and descriptive,
request-safe titles; directional photo pan controls; video exit guidance
and external playback link; descriptive photo triggers; thumbnail fallbacks
and reserved dimensions; selected-control/rating contrast; static filmography
genres allowing the movie link to receive clicks; reduced lightbox motion.

## Responsive results

The Air preview has no resize command. Its checks used its actual 1067px
viewport. Exact viewport tests were then performed in a separate installed
headless Microsoft Edge browser through its debugging protocol, with a 900px
viewport height and device scale factor 1. These are real browser viewport
checks, not resized page containers or jsdom layout assertions.

Both Fight Club and David Fincher detail pages passed the following checks.
Column counts reflect these pages' populated grids and native scrollbars.

| Width | Hero on both pages | Cast / media / filmography columns | Horizontal overflow |
| --- | --- | --- | --- |
| 320px | Stacked, images fit available width | 1 / 1 / 1 | None |
| 390px | Stacked, images capped at 320px | 2 / 2 / 1 | None |
| 767px | Stacked, images capped at 320px | 2 / 2 / 2 | None |
| 768px | Side by side, 260px images | 4 / 2 / 2 | None |
| 1024px | Side by side, 320px images | 5 / 3 / 3 | None |
| 1440px | Side by side, 320px images | 8 / 4 / 4 | None |

Expanded search retained the brand's position at every requested width.
Photo and portrait dialogs kept their controls within the viewport and
restored trigger focus on Escape at every requested width. The 320px video
dialog kept its player, close/navigation controls, and external link onscreen.
First/last hero, cast, photo, video and filmography items were hovered at
320px, 768px and 1440px: scaling remained inside the page bounds without
horizontal overflow. Thumbnail clipping stays inside the rounded tile.
Representative 320px/768px hero and 320px lightbox screenshots were inspected.

## Accessibility

Browser checks confirmed a single named main per detail page, route focus
on main, descriptive movie/person titles, visible keyboard focus, search
focus/escape behavior, retained biography focus, and photo/video dialog exit
and focus restoration. Filmography poster/title/role hit tests reached the
movie link. Crew filtering also produced a correctly capped single-card
result. Search and primary lightbox controls are 44px; pan controls are
64px by 40px; filmography selects/views reserve at least 44px outer height.

The existing tests cover late requests and unmounts without stale title or
focus changes, all four photo pan directions and bounds, zoom/reset,
navigation, Escape, focus containment/restoration, gesture handling,
fullscreen failures, thumbnail errors and accessible photo names. Video
guidance and the safe external YouTube link were checked in browser and tests.
Cross-origin player keystrokes remain owned by YouTube; Escape is handled
outside the iframe and the guidance explains reaching the dialog controls.

Rating and selected filmography controls use #232323 on #f65261, a 4.71:1
text contrast ratio. Tests cover selected hover/active/focus states. Browser
reduced-motion emulation confirmed zero-duration search, hero and card
transitions. Styles/tests cover media and lightbox motion suppression.

## Typography and confirmed fixes

The preview rejects Montserrat with a CORS message about a disallowed
cache-control request header. App code/configuration adds no such font
request header. Montserrat loads successfully with zero font errors in
standalone headless Edge on both the development server and the locally
served production build. The observed failure is specific to the preview
request path; its internal header injection cannot be inspected here.

The shared SCSS barrel redundantly emitted Google Fonts imports into 16
loaded stylesheets. Moved font loading to the global stylesheet and removed
the unused Roboto request. Montserrat, its requested weights/italics,
display=swap, and the sans-serif fallback remain unchanged. Development now
has one importing stylesheet and production CSS contains one Google Fonts
import. No font dependency or typography design changed.

One further defect was reproduced: the CSS reset kept html:focus-within
smooth scrolling under reduced motion. Added a matching reduced-motion
override and a regression test against the compiled global CSS. Rechecked
both pages in development and the production build: normal preference uses
smooth scrolling; reduced motion uses auto.

## Loading and failure cases

Browser-only intercepted API fixtures at 320px, 768px and 1440px exercised
long movie/person names, long cast roles and birthplace metadata, a long
expanded biography, one filmography entry, and missing/404 media thumbnails.
All retained one main and avoided page overflow; failed thumbnails became
fallbacks with no broken visible images. Fixtures never changed API data or
repository application code.

With delayed API responses, loading titles and focus were correct and the
navigation stayed at the same document position. The loading hero reserves
its minimum height; successful content can expand it. Image aspect ratios
and thumbnail dimensions reserve space. This is not a zero-CLS claim or a
production Core Web Vitals measurement.

## Files changed in this phase

- [_fonts.scss](air-file://kl1kkar98c1q55gofujj/work/git/movie-explorer/apps/web/src/assets/scss/_fonts.scss?type=file&root=E%3A): remove unused Roboto.
- [_index.scss](air-file://kl1kkar98c1q55gofujj/work/git/movie-explorer/apps/web/src/assets/scss/_index.scss?type=file&root=E%3A): stop forwarding font CSS to every component.
- [index.scss](air-file://kl1kkar98c1q55gofujj/work/git/movie-explorer/apps/web/src/index.scss?type=file&root=E%3A): load fonts once and honor reduced-motion scrolling.
- [indexStyles.test.ts](air-file://kl1kkar98c1q55gofujj/work/git/movie-explorer/apps/web/src/indexStyles.test.ts?type=file&root=E%3A): global reduced-motion regression test.
- This verification report. All pre-existing Phase 22.5.x changes remain intact.

## Final checks and limitations

- Frontend tests: 32 files, 249 tests passed.
- Frontend lint: Oxlint, ESLint, TypeScript and Stylelint passed.
- Explicit frontend typecheck: passed.
- Frontend production build: passed; both detail routes and Montserrat also
  passed standalone browser smoke checks against that build.
- git diff --check: passed.

No confirmed defects remain open in the tested scope. Browser coverage is
Chromium/Edge with emulated viewport sizes, not physical touch devices,
Firefox, Safari, or screen-reader speech testing. Gesture/fullscreen edge
cases have automated coverage; native mobile gestures were not certified.
Production deployment/CSP and unavailable third-party media are outside the
local smoke checks. Google Fonts remains an external dependency and blocked
networks use the existing fallback. API/e2e suites were not rerun because
this phase changes only frontend styles, a frontend test, and documentation.
