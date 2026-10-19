# TypeScript, JavaScript and React

## Modules and expressions

- Keep external packages and workspace packages in one continuous import block;
  do not make a separate group just because an import is type-only or comes from
  a workspace package. Separate relative imports (`./` and `../`) from the
  non-relative block with exactly one blank line. Keep related relative imports
  together.
- Consolidate imports from the same module when safe. Preserve the existing
  type-only versus runtime import form; do not automatically add or remove
  `type` based only on apparent usage. Retain existing `import type` declarations
  and runtime imports unless the project's tooling or an explicit requirement
  calls for a syntax change. When combining duplicate imports, keep the original
  semantics of every imported name:

  ```ts
  import { Inject, Injectable } from "@nestjs/common";
  import type {
    MovieDetails,
    MovieListResponse,
    MovieQueryParams,
    MovieSection,
    MovieSuggestionsResponse,
  } from "@movie-explorer/contracts";

  import { MOVIE_PROVIDER, MovieProvider } from "./movie-provider";
  ```

  For example, consolidate duplicate imports from the same type-only module
  without changing their type-only form:

  ```ts
  // Before
  import type { MovieSection } from "@example/contracts";
  import type { MovieDetails, MovieQueryParams } from "@example/contracts";

  // After
  import type {
    MovieDetails,
    MovieQueryParams,
    MovieSection,
  } from "@example/contracts";
  ```

- Keep side-effect imports, CSS/SCSS imports, polyfills and framework setup in
  their original execution order. Add group-separating blank lines around them
  only where that preserves the existing sequence. Do not sort specifiers or
  move imports solely for visual consistency.
- Let configured ESLint import rules own any required ordering. Prettier and
  Oxfmt format imports but do not establish a universal sort order; do not add a
  sorting dependency or rule for readability alone.
- Separate top-level types, constants, helpers and exports by purpose. Keep small
  related constants or interface properties together; do not space every field.
  Preserve export forms and object/array member order.
- Separate guard clauses from the successful path when useful. Keep a short
  sequence of related guards together, then leave one blank line before the
  next distinct operation. Separate setup/initialization from a subsequent
  operation and a final return from preceding work when those are distinct
  phases. Keep tightly related statements together; do not add a blank line after
  every statement or within a coupled expression. Never rewrite branches, add
  early returns, change `await`/`return`, or replace loops as formatting.
- Let the formatter wrap long expressions and literals. A complicated expression
  may warrant a separately proposed refactor; whitespace cannot solve everything.
- In async code, distinguish preparation, request, response handling and cleanup
  with sparse blank lines. Keep catch/finally attached to try; preserve error
  types, cancellation, timer setup and cleanup sequencing.
- Preserve comments with their target, including lint directives. Comments should
  explain constraints or reasons rather than narrate assignments. Keep default
  exports and barrel exports in their existing form.

Before:

```ts
const controller = new AbortController();
const options = { signal: controller.signal };
const response = await fetch(url, options);
if (!response.ok) throw new Error("Request failed");
return response.json();
```

Apply the same internal spacing to functions and callbacks, including React
effects. Separate an effect's guard, work and cleanup return when they are
distinct. Separate a locally declared handler from subsequent operations such
as registering it with `addEventListener`. Use exactly one blank line between
these distinct blocks, while keeping statements that implement one operation
together:

```tsx
useEffect(() => {
  if (!closing) return undefined;

  const timeout = window.setTimeout(() => {
    setOpenAt(null);
    setClosing(false);
  }, 220);

  return () => window.clearTimeout(timeout);
}, [closing]);
```

For an event effect, place a blank line after the local handler declaration and
another between registration and cleanup:

```tsx
useEffect(() => {
  if (!open) return undefined;

  const outside = (event: PointerEvent) => {
    if (isOutside(event)) closePanel();
  };

  document.addEventListener("pointerdown", outside);

  return () => document.removeEventListener("pointerdown", outside);
}, [open, closePanel]);
```

After:

```ts
const controller = new AbortController();
const options = { signal: controller.signal };

const response = await fetch(url, options);
if (!response.ok) throw new Error("Request failed");

return response.json();
```

## Components and hooks

### Control flow and logical phases

Prefer braces around `if`, `else`, and loop bodies. Multiline conditions and
both branches of an `if`/`else` always use braces. When adding braces to existing
code, preserve the condition and body exactly, along with evaluation order and
`else` association; skip transformations with scope or behavior ambiguity.
Apply the same preference in React handlers, NestJS/Node.js code, and tests.

Separate distinct phases with one blank line: a guard from subsequent work,
input/state mutation from calculations, collection from processing, calculations
from a resulting decision, and a callback declaration from registration or
cleanup. Keep dependent statements together and do not space every statement.
For example:

```ts
if (!points.current.has(event.pointerId)) {
  return;
}

points.current.set(event.pointerId, {
  x: event.clientX,
  y: event.clientY,
});

const [first, second] = [...points.current.values()];
const dx = first.x - current.x;
const dy = first.y - current.y;

if (Math.hypot(dx, dy) > threshold) {
  current.moved = true;
}

if (second) {
  updatePinch(dx, dy);
} else if (zoomed) {
  updatePan(dx, dy);
}
```

For new code, a useful default is router/context hooks, local state/refs, derived
values, existing memoized calculations, event handlers, effects, early returns,
then JSX. This is guidance, not a sorting algorithm. Dependencies often justify
another order. In existing components, add boundaries without reordering hooks
or statements. Never move a hook below a conditional return or add useMemo or
useCallback to make a section fit the outline.

Keep related `useState` and `useRef` declarations together, then separate them
from effects and handlers where that clarifies ownership. Separate independent
effects and meaningful handler implementations. Put one blank line before a
hook's final return when preceding work exists. Preserve hook order, effect
dependencies, callback identity, and event-handler behavior.

Before:

```tsx
const location = useLocation();
const [params, setParams] = useSearchParams();
const [open, setOpen] = useState(false);
const panelRef = useRef<HTMLDivElement>(null);
const filters = readFilters(params);
const normalized = normalizeFilters(filters);
```

After:

```tsx
const location = useLocation();
const [params, setParams] = useSearchParams();

const [open, setOpen] = useState(false);
const panelRef = useRef<HTMLDivElement>(null);

const filters = readFilters(params);
const normalized = normalizeFilters(filters);
```

Separate independent handlers and effects; inside an effect, make guards, work and
cleanup legible without spreading every setter onto a separate visual island.
Keep dependent calculations next to their inputs when that reads better.
When a component has statements before its final JSX, put exactly one blank line
before the `return (`. Do not add blank JSX nodes or spacer lines to create layout.

Use existing semantic JSX blocks as landmarks. Preserve sibling order, fragments,
prop spread order, conditionals, keys, whitespace-sensitive text and accessibility
attributes. Do not extract components, handlers or render helpers in a formatting
task. Do not force all props onto separate lines or insert visual spacer nodes.
Large JSX that still reads poorly should be reported as a possible future refactor.

## Next.js and Node.js

Preserve directive prologues such as `'use client'` and `'use server'`, server/client
boundaries, route exports and module initialization order. In Node.js preserve
CommonJS/ESM forms, side effects and startup registration order. Do not convert
module systems or framework patterns to standardize appearance.
