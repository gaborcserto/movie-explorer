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

## Recommended visual structure

Keep related statements together. Use one blank line between distinct
responsibilities, adjacent function/method definitions, independent effects, and
setup and rendering where it aids scanning. Do not insert blank lines after every
declaration or return. Small coherent functions may need no interior separation.

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

Use descriptive existing names and comments explaining reasons. Naming changes
belong to a separately requested refactor. Do not add section comments to obvious
code or force visual symmetry where responsibilities differ.

Read only relevant references:

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
