# React UI design in Movie Explorer

Use this reference when a UI change needs a decision about component boundaries,
state ownership, effects, or accessible interaction. Keep the skill entrypoint
as the activation guide; this file provides implementation-level examples.

## Give components one clear reason to change

Split a component when a part has its own meaningful behavior, state boundary,
or reuse opportunity. Compose focused pieces through props and children when
that makes ownership clearer. A component does not need a wrapper or a new
file solely to meet a size rule. Keep data loading behind the existing API
utility and let presentation components receive application-owned values.

For example, a movie filter panel can own the layout and labels while its
parent owns the selected values and applies them to URL-backed results:

```tsx
type GenreFilterProps = {
  selectedGenres: string[];
  onToggleGenre: (genre: string) => void;
};

function GenreFilter({ selectedGenres, onToggleGenre }: GenreFilterProps) {
  return (
    <fieldset>
      <legend>Genres</legend>
      {['Drama', 'Comedy'].map((genre) => (
        <label key={genre}>
          <input
            type="checkbox"
            checked={selectedGenres.includes(genre)}
            onChange={() => onToggleGenre(genre)}
          />
          {genre}
        </label>
      ))}
    </fieldset>
  );
}
```

Keep the canonical search, filter, sort, and page values in the URL when they
need to survive refreshes or be shareable. Use local state for temporary
presentation details. Derive display values during render instead of
maintaining a second state copy that must be synchronized.

## Add a custom hook for shared behavior

A custom hook is useful when multiple consumers need the same stateful
interaction or when extracting it gives one component a clearer purpose. A
hook that only renames a single `useState` call adds indirection without
sharing behavior. Hooks share logic, not state instances: each caller gets its
own state unless the hook uses a shared provider or external store.

Before extracting a hook, identify its inputs, returned values, side effects,
and cleanup. Prefer a pure helper for calculations that do not use React
state, context, or lifecycle. The
[WebDevSimplified hooks repository](https://github.com/WebDevSimplified/useful-custom-react-hooks)
is an educational collection for considering hook boundaries; its examples
are not project dependencies or copyable templates.

## Keep effects synchronized with external systems

An effect is appropriate for synchronizing with a network request, browser
subscription, timer, or imperative widget. It is usually unnecessary for
calculating filtered movies or responding directly to a button click. Keep
each effect tied to the reactive values it reads, and cancel its resources
when those values change or the component unmounts.

For a request driven by a current search term, pass an abort signal through
the existing API boundary and avoid applying a result after cancellation:

```tsx
useEffect(() => {
  const controller = new AbortController();

  loadMovieSuggestions(query, controller.signal)
    .then((suggestions) => {
      if (!controller.signal.aborted) setSuggestions(suggestions);
    })
    .catch((error: unknown) => {
      if (!controller.signal.aborted) setError(error);
    });

  return () => controller.abort();
}, [query]);
```

This illustrates cancellation ownership, not a requirement to fetch from a
component or to add another data hook. Continue using the existing API client
and established search debounce. If an async API cannot be canceled, use an
effect-local current flag before committing a result. Do not hide stale
closures with empty dependency arrays or mutable refs without a concrete need.

## Use semantic controls for keyboard access

Native controls provide expected focus, keyboard, and form behavior. Use a
`button` for an action, links for navigation, labelled inputs for filtering,
and headings that describe page structure. Keep visible focus styling. Do not
turn a generic element into a button unless a native control cannot express
the interaction; a custom control then needs focusability, keyboard behavior,
and an accessible name that match its role.

When loading or updating results, expose the state in a useful way (for
example, a labelled status message) and avoid moving focus unexpectedly.
Dialogs and suggestion lists need deliberate focus behavior and keyboard
testing, not ARIA attributes added by guesswork.

## Sources and attribution

This reference uses original Movie Explorer guidance and examples. The
following sources informed the recommendations; no third-party skill text or
implementation was copied:

- React, [Thinking in React](https://react.dev/learn/thinking-in-react),
  [Sharing State Between Components](https://react.dev/learn/sharing-state-between-components),
  [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect),
  [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects),
  and [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks).
- React, [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks).
- W3C WAI-ARIA Authoring Practices,
  [Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/).
- Jeff Allan,
  [claude-skills React expert reference](https://github.com/Jeffallan/claude-skills/tree/main/skills/react-expert/references).
- WebDevSimplified,
  [useful-custom-react-hooks](https://github.com/WebDevSimplified/useful-custom-react-hooks),
  reviewed only as an educational reference for reusable hook design.
