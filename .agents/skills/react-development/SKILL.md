---
name: react-development
description: Use for React UI and behavior changes in apps/web, including components, state, routing, accessibility, and reusable hooks; excludes API contract and performance-only work.
---

# React development

Use this skill for user-facing React behavior in `apps/web`. Follow the
frontend boundaries and conventions in the root `AGENTS.md`; use
`api-contract-change` for public API or shared contract changes and
`react-performance` when the task is specifically about measured rendering or
runtime performance.

- Inspect nearby components, hooks, route state, API utilities, and tests
  before changing structure. Preserve URL-backed search, filters, sorting,
  pagination, and selected-resource behavior.
- Prefer existing hooks and utilities. Add a custom hook only when it
  encapsulates meaningful reusable behavior; keep component-specific logic
  close to its component.
- Avoid unnecessary effects, duplicate state, and abstractions. Keep hook
  dependencies accurate, clean up subscriptions and timers, prevent stale
  closures, and cancel or ignore obsolete asynchronous work where needed.
- Follow current React 19 and TypeScript conventions, semantic HTML, native
  controls, keyboard interaction, and visible focus behavior.
- Add or update focused observable tests when behavior changes. Ask
  `verify-change` to select checks using the repository commands in
  `AGENTS.md`.

For custom-hook design ideas, see the educational
[WebDevSimplified useful-custom-react-hooks repository](https://github.com/WebDevSimplified/useful-custom-react-hooks).
Use it to consider the shape and boundaries of reusable behavior; write
project-specific code and do not copy its implementation. Consult React's
[custom Hooks guide](https://react.dev/learn/reusing-logic-with-custom-hooks)
and [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks) for
current guidance. For project-specific component, state, effect, and
accessibility examples, load [the React UI design reference](references/react-ui-design.md).
