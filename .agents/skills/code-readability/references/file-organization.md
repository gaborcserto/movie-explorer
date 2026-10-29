# File and component organization

Organize files around clear responsibilities and ownership. A directory should
represent one UI responsibility or a small group of closely related
responsibilities, not simply collect whatever is currently nearby.

## Component directories

### Reusable React components

In React, Vite, and Next.js projects, put each new reusable component in its
own dedicated directory and provide an `index.ts` as its public entry point.
This applies to Server and Client Components. The entry point should export the
component and any consumer-facing prop or domain types; keep implementation
details private. Consumers should import from the component directory rather
than reach into its implementation file. Colocate component-owned styles,
tests, hooks, and small utilities where that improves cohesion.

```text
components/
  animated-select/
    index.ts
    animated-select.tsx
    animated-select.scss
    animated-select.test.tsx
```

Follow the repository's established file naming. Avoid adding barrels above
the component directory or creating cycles between entry points. For existing
components, add an entry point or migrate imports only when the change is safe
and does not broaden the task into unrelated reorganization.

For React and other component-based frontend projects, colocate a component's
implementation, focused tests, styles, small private helpers, and a barrel
export when that matches local conventions. Keep stylesheets with their owning
feature when selectors are independently owned. Preserve shared stylesheet
order and cascade when a feature shares a stylesheet with its parent.

Use direct-file counts as a review signal, not a target or enforcement rule:

- 1–5 direct files is a useful starting range for many components.
- 6–9 direct files can be reasonable when the files share ownership.
- At 10 or more direct files, review boundaries and file ownership.

Count files directly inside a directory separately from files in its
subdirectories. Do not split cohesive files or create subdirectories solely to
meet a count. Avoid unnecessary barrels, wrapper directories, and deep nesting.

Keep component-specific hooks in that component or feature's `hooks/`
directory. Move a hook to shared code only when multiple independent consumers
already justify shared ownership; anticipated reuse is not enough.

## Feature subdirectories and public entry points

Use subdirectories when several files belong to a cohesive responsibility such
as credits, media, metadata, or recovery. Keep the feature root focused on page
composition and orchestration, and review it when unrelated responsibilities
accumulate or it reaches ten direct files. Keep implementation, tests, and
styles together when they share ownership; a numeric threshold alone does not
justify moving tightly coupled files.

Give a component directory an `index.ts` when consumers benefit from a stable,
clear import path. Export the intended public components and types from that
entry point, while leaving private helpers, hooks, and implementation modules
available only through their owning feature. Update consumers to use the
entry point and check the resulting dependency graph for circular imports.
Avoid barrels that add indirection without clarifying ownership or imports.

Keep component-specific hooks in a `hooks/` directory when they form a real
group or are part of the feature's local implementation. Avoid a one-file
directory when the hook can remain beside its only component without making
the feature harder to scan. Avoid deep nesting and wrapper directories that
only repeat a component name.

A unified wrapper over distinct components can simplify a consumer API when
it has a small, discriminated prop union and delegates rendering to the
existing implementations. Keep implementation-specific state and behavior in
those components. Skip the wrapper when consumers still need the separate
components or the adapter adds more branching and indirection than it removes.

## Shared and feature ownership

Keep tightly coupled components beside their owning feature. A component is a
candidate for a shared location when it has an independent responsibility or
existing consumers in separate features. Check imports, styles, tests, and
runtime dependencies before moving it. A name that sounds generic does not
establish shared ownership.

Extract a component when it creates a useful responsibility boundary or is
already reused, and keep its implementation, tests, and styles together where
possible. Do not extract a fragment only to shorten a file, speculate about
future reuse, or create a generic framework from one feature's behavior.

For backend TypeScript projects, apply cohesion to modules and services:
co-locate related implementation and tests according to the framework's
module boundaries, and keep shared code shared only when ownership and use are
genuine. Frontend directory-count guidance does not dictate backend structure.

## Safe reorganization

Separate directory moves from behavioral refactoring. Inspect all imports,
exports, tests, styles, and side-effect ordering before moving files. Update
consumers without changing public APIs, implementation logic, CSS selectors,
or execution order. Verify focused tests and inspect rename-aware diffs after
each cohesive move. If ownership is unclear or a move implies behavioral
redesign, document the recommendation for a separate task instead.
