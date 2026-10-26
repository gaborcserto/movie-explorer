---
name: code-readability
description: Review source readability or apply behavior-preserving visual grouping in formatting tasks across TypeScript, React, Next.js, Node.js, NestJS, PHP/Laravel, and SCSS. Use for explicit readability audits or formatting work, not as permission for unrelated refactoring.
---

# Code readability

Make source easy to scan through meaningful visual boundaries. The repository's
instructions and configured tools take precedence over the recommendations here.

## Choose the mode

- **Readability Review:** inspect and report issues with small before/after
  excerpts and reasons. Do not modify source files. Write reports only when asked.
- **Readability Formatting:** apply the requested scope and approved conventions.
  An explicit request to format authorizes that scope; do not request approval
  again. If the request only asks to audit or suggest, remain in Review mode.

## Required safeguards

- Read applicable repository instructions, status, staged and unstaged diffs,
  nearby code, formatter/linter configuration, hooks, and CI before editing.
  Preserve unrelated changes; do not stage, commit, push, or install dependencies
  unless requested.
- Preserve behavior, public APIs, import bindings and execution order, directives,
  decorators, React hook execution order, JSX text, CSS cascade, and test intent.
  Preserve imports unless regrouping is explicitly safe; side-effect imports
  and framework directives are especially sensitive.
- Reject refactoring disguised as formatting: no unrelated renaming, extraction,
  architecture changes, new abstractions, dependencies, memoization, altered
  conditions, async sequencing, or tests weakened to accommodate regressions.
  Report useful refactors separately. Do not fix unrelated failures.
- Limit edits to selected files; exclude generated output, vendor code, caches,
  dependencies, snapshots, and lockfiles unless the task specifically targets them.

## Import organization

Keep external and workspace-package imports together in one block, then separate
relative imports from that block with exactly one blank line. Consolidate
duplicate imports from the same module when safe. Preserve each import's existing
type-only versus runtime form; do not automatically add or remove `type` based
only on apparent usage. Do not reorder imports when evaluation order can change;
preserve side-effect imports, including stylesheet imports, in their existing
order. Let the project's ESLint, Prettier, Oxfmt or equivalent rules determine
syntax and wrapping, and do not add an import sorter for this convention.

## Vertical Spacing / Logical Grouping

Use blank lines to show distinct logical steps in TypeScript and TSX:

- Separate setup or declarations from a following control-flow operation when
  they serve different purposes. Prefer a blank line before a new `if`, `try`,
  `for`, `while`, or `switch` operation.
- Separate validation, fetching, transformation, error handling, and return
  phases when that makes the flow easier to scan.
- Put a blank line after a completed `try/catch/finally` or `if/else` before
  another independent operation, and before a final `return` when earlier
  statements form a distinct phase.
- In React code, visually group state declarations, effects, callbacks, and the
  final return. Keep tightly related statements together.
- Avoid excessive blank lines or mechanical spacing inside one logical
  operation. Keep `if` attached to its `else`, and `try` attached to its
  `catch`/`finally`.

These examples show grouping, not mandatory abstractions or universal blank-line
insertion.

Before:

```ts
let imdb: RatingResult;
if (!this.omdb.enabled) {
  imdb = { status: 'unavailable', reason: 'not-configured' };
}
return { tmdb, imdb };
```

After:

```ts
let imdb: RatingResult;

if (!this.omdb.enabled) {
  imdb = { status: 'unavailable', reason: 'not-configured' };
}

return { tmdb, imdb };
```

Separate a completed async step from the next conditional within a `try`:

```ts
try {
  const imdbId = await this.ids.resolve(kind, id);

  if (imdbId) {
    imdb = await this.omdb.findRating(imdbId, kind);
  }
} catch (error) {
  handleError(error);
}
```

Keep setup distinct from error-handled work, while keeping cleanup attached:

```ts
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 3000);

try {
  return await fetch(url, { signal: controller.signal });
} finally {
  clearTimeout(timer);
}
```

For hooks, group related state, the effect, callback, and return:

```tsx
function useExample(enabled: boolean) {
  const [data, setData] = useState<Data>();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Effect logic.
  }, [enabled]);

  const retry = useCallback(() => {
    // Retry logic.
  }, []);

  return { data, error, retry };
}
```

See [TypeScript and React](references/typescript-react.md) for detailed
language-specific guidance.

## Recommended visual structure

Keep related statements together. Use exactly one blank line between distinct
logical phases when it helps the reader follow the operation:

- Preconditions or guard clauses and subsequent work.
- Setup and initialization, then state/ref mutation or calculations that form a
  later phase.
- Data collection and processing, or calculations and a decision based on them.
- Local event-handler declarations, listener registration, and cleanup.
- Independent effects and meaningful phases inside callbacks.
- Component setup and its final JSX return.

Keep tightly related statements together. Do not insert blank lines after every
declaration, assignment, `await`, function call, or return. Small coherent
functions may need no interior separation. In a component, leave exactly one
blank line before its final JSX return when another statement precedes it.
Preserve statement and hook order. Accept only spacing that the existing
Prettier, ESLint, Stylelint, Oxfmt or equivalent configuration permits.

Within longer functions, use visual boundaries for preconditions, input/state
updates, collection, calculations, decisions, side effects, and final cleanup or
return. These are conceptual phases, not mandatory sections. For example, keep
an early guard apart from the successful path, but keep a state mutation with
the branch that requires it:

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

### Braced control flow

Prefer explicit braces for `if`, `else`, and loop bodies. Add braces to existing
unbraced bodies only when the change clearly preserves the body statement,
condition, association with any `else`, evaluation order, and scope. Always use
braces for multiline conditions and for both sides of `if`/`else` branches. Do
not rewrite the condition, body, or surrounding control flow as part of adding
braces. This applies to source, callbacks, and tests in React, Next.js, NestJS,
Node.js, and plain TypeScript.

Before:

```ts
if (
  status !== "loaded" ||
  (event.pointerType === "mouse" && event.button !== 0)
)
  return;
```

After:

```ts
if (
  status !== "loaded" ||
  (event.pointerType === "mouse" && event.button !== 0)
) {
  return;
}
```

Keep `else` blocks explicit too:

```ts
if (now - lastTap.current < 300) {
  update(view.scale > 1 ? 1 : 2);
  lastTap.current = 0;
} else {
  lastTap.current = now;
}
```

Do not add an ESLint rule, formatter setting, or automated rewrite to enforce
this preference. Leave syntax alone when bracing could change scope or when the
transformation is not plainly behavior-preserving.

Inside `test()` and `it()` callbacks, group statements by scenario intent and
separate distinct phases with exactly one blank line. Typical boundaries include
fixture setup, user interaction, input editing, submit/apply actions, navigation
or state transitions, assertions, and later phases. Keep paired operations and
an action with its immediate outcome together. Multi-step interaction tests do
not need a rigid Arrange/Act/Assert shape; never add spacing mechanically after
each `await`, assertion or call. See [Testing](references/testing.md) for examples.

When a test uses callbacks, visitors, traversals, or event handlers to collect
data, visually separate the setup, collection operation, and subsequent
assertions. Separate independent verification phases with one blank line, while
keeping related assertions together.

Before:

```ts
const filters = readFilters(params);
const normalized = normalizeFilters(filters);
saveFilters(normalized);
return normalized;
```

After, when reading/normalizing and persistence are distinct phases:

```ts
const filters = readFilters(params);
const normalized = normalizeFilters(filters);

saveFilters(normalized);
return normalized;
```

Within an async function, preparation, the request, and the final response can
form distinct phases. A guard and a final return stay visually separate from the
following or preceding work:

```ts
async function loadMovie(id: number) {
  if (!id) return undefined;

  const options = createRequestOptions();

  const response = await fetchMovie(id, options);
  if (!response.ok) throw new Error("Request failed");

  return response.json();
}
```

Use descriptive existing names and comments explaining reasons. Naming changes
belong to a separately requested refactor. Do not add section comments to obvious
code or force visual symmetry where responsibilities differ.

Read only relevant references:

- [File organization](references/file-organization.md): component cohesion,
  directory ownership, and safe moves.
- [TypeScript and React](references/typescript-react.md): imports, expressions,
  hooks, component structure, JSX, Next.js and Node.js boundaries.
- [Backend](references/backend.md): NestJS classes, DTOs, integrations, PHP/Laravel.
- [Styles](references/styles.md): SCSS selectors, declarations, states and media.
- [Testing](references/testing.md): fixtures, setup, assertions and cleanup.

## Tool boundaries and verification

1. **Formatter:** let Prettier, Oxfmt, Pint, or the configured equivalent own
   indentation, quotes, punctuation and wrapping. Do not duplicate its rulebook.
2. **Linter:** retain enforced quality, import, accessibility and style rules.
   Do not disable rules or add formatter-ignore comments for a visual preference.
3. **Judgment:** choose responsibility boundaries, helpful grouping and whether
   a file needs any change. Avoid global whitespace regexes.

Format only selected files with the existing local tool, then inspect the result.
Formatters commonly collapse multiple blank lines, remove edge blank lines, and
normalize expression/JSX wrapping. Do not rely on manual alignment, forced wraps,
or blank JSX lines (which can affect text). If a grouping is removed, accept the
tool's output or report the conflict; do not fight the formatter. Check a second
pass is stable when adopting a new pattern. Review mode can test in memory or
temporary files without changing source.

Follow the repository's verification skill/workflow when present; it owns check
selection. Otherwise use existing file-scoped formatter/linter checks and relevant
tests/typechecks for edited source. Review the full diff and `git diff --check`;
confirm changes preserve tokens, comments and literal contents, not merely that
tests pass. Widen checks for broader batches or uncertain effects. Documentation
and skill-only work needs metadata, relative-link and whitespace validation, not
the entire application suite. Report what ran, failures, and remaining ambiguity.
