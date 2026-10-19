# TypeScript, JavaScript and React

## Modules and expressions

- Follow local import rules. Where safe, group platform/external imports, internal
  imports and local modules, keeping type imports consistent with the project.
  Do not sort specifiers or move stylesheet/polyfill imports just for appearance.
- Separate top-level types, constants, helpers and exports by purpose. Keep small
  related constants or interface properties together; do not space every field.
  Preserve export forms and object/array member order.
- Separate guard clauses from the successful path when useful. Keep a short
  sequence of related guards together. Never rewrite branches, add early returns,
  change `await`/`return`, or replace loops as part of formatting.
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
if (!response.ok) throw new Error('Request failed');
return response.json();
```

After:

```ts
const controller = new AbortController();
const options = { signal: controller.signal };

const response = await fetch(url, options);
if (!response.ok) throw new Error('Request failed');

return response.json();
```

## Components and hooks

For new code, a useful default is router/context hooks, local state/refs, derived
values, existing memoized calculations, event handlers, effects, early returns,
then JSX. This is guidance, not a sorting algorithm. Dependencies often justify
another order. In existing components, add boundaries without reordering hooks
or statements. Never move a hook below a conditional return or add useMemo or
useCallback to make a section fit the outline.

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
