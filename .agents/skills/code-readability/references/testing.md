# Test readability

- Separate fixture declarations, helper functions, lifecycle hooks and tests.
  Keep related mock defaults together. Preserve describe nesting and hook order;
  do not introduce new describe blocks or reorganize tests solely for appearance.
- Inside each `test()` or `it()` callback, group by scenario intent. Use exactly
  one blank line between distinct phases such as fixture setup, initial user
  interaction, input editing, submit/apply, navigation or state transitions,
  assertions and subsequent phases. Keep closely related statements together;
  do not add a blank line mechanically after every `await`, assertion or call.
  Interaction tests can have several action/outcome cycles; preserve their
  narrative instead of imposing a rigid Arrange/Act/Assert shape.
- Keep assertions about one outcome together. Separate distinct outcomes only
  when the boundary helps. Avoid repetitive Arrange/Act/Assert comments when
  spacing and names already communicate the phases.
- When a test uses callbacks, visitors, traversals, or event handlers to collect
  data, visually separate the setup, collection operation, and subsequent
  assertions. Separate independent verification phases with one blank line,
  while keeping related assertions together. Apply this to callback-based tests
  across frontend, Node.js, backend, and other test frameworks.
- Preserve fixture values, mock setup, reset/restore choices, waits, timers and
  cleanup. Never replace awaited interactions, weaken assertions or update
  snapshots to conceal a formatting regression.
- Keep parameterized case tables adjacent to their test. Let the formatter wrap
  rows; do not manually align columns or extract fixtures to reduce line counts.
  Existing local helpers are useful; adding helpers is a separate refactor.

For callback-based collection, separate setup, traversal, and assertions while
keeping a visitor's guard next to the collection it controls.

Before:

```ts
const names: string[] = [];
collection.visit((item) => names.push(item.name));
expect(names).toEqual(['one', 'two']);
```

After:

```ts
const names: string[] = [];

collection.visit((item) => names.push(item.name));

expect(names).toEqual(['one', 'two']);
```

Before:

```ts
const router = setup('/search?extra=keep');
await open();
await apply();
await closed();
expect(router.state.location.search).toBe('?extra=keep');
expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
```

After:

```ts
const router = setup('/search?extra=keep');

await open();
await apply();
await closed();

expect(router.state.location.search).toBe('?extra=keep');
expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
```

For a longer scenario, separate draft checks, commit interaction, committed-state
checks and reopen checks while preserving their original order. Readability work
does not authorize repairing a failing test or modifying application behavior.

Keep paired input changes together, and keep close/reopen operations together.
Separate navigation from the UI checks that follow it:

```tsx
await userEvent.clear(input);
await userEvent.type(input, '2024');

await apply();

await act(async () => {
  await router.navigate(-1);
});

await closed();
await open();

expect(screen.getByLabelText('Release year')).toHaveValue('2000');
```
