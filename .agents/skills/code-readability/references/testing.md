# Test readability

- Separate fixture declarations, helper functions, lifecycle hooks and tests.
  Keep related mock defaults together. Preserve describe nesting and hook order;
  do not introduce new describe blocks or reorganize tests solely for appearance.
- Use blank lines for meaningful arrange/act/assert phases. Interaction tests
  often have several act/assert cycles: group each action with its immediate
  outcome rather than moving every assertion to the bottom.
- Keep assertions about one outcome together. Separate distinct outcomes only
  when the boundary helps. Avoid repetitive Arrange/Act/Assert comments when
  spacing and names already communicate the phases.
- Preserve fixture values, mock setup, reset/restore choices, waits, timers and
  cleanup. Never replace awaited interactions, weaken assertions or update
  snapshots to conceal a formatting regression.
- Keep parameterized case tables adjacent to their test. Let the formatter wrap
  rows; do not manually align columns or extract fixtures to reduce line counts.
  Existing local helpers are useful; adding helpers is a separate refactor.

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
