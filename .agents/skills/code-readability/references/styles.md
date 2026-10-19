# SCSS and CSS readability

- Keep `@use`/`@forward` and imports in their established order; separate the
  module header from variables/tokens and selectors. Do not migrate Sass syntax
  during formatting or move imports with cascade effects.
- Separate sibling rule blocks with one blank line. Within longer declaration
  lists, consider layout/position, sizing/spacing, typography, appearance and
  motion groups, only where nearby code and Stylelint permit it. Short blocks
  generally need no interior blank lines. Alphabetical projects should retain
  their convention; do not impose a competing universal property order.
  Some standard configurations prohibit blank lines between declarations via
  `declaration-empty-line-before`. In that case retain compact declarations and
  use existing selector boundaries; Prettier accepting a split is insufficient.
- Add spacing without reordering declarations, fallbacks, custom properties,
  nested selectors, mixins or media rules. Shorthands, duplicates, specificity
  and source order can change behavior even if individual values are unchanged.
- Distinguish base declarations, nested element rules, pseudo-classes/state
  selectors, responsive overrides and reduced-motion rules where appropriate.
  Preserve existing placement; do not reorganize the cascade to match an outline.
- Keep nesting shallow in new code. Report excessive nesting separately rather
  than flattening or renaming selectors as formatting.

Before:

```scss
.panel {
  display: flex;
  align-items: center;
  padding: 12px;
  color: $text;
  background: $surface;
  border-radius: 6px;
}
```

After, where optional declaration groups improve scanning:

```scss
.panel {
  display: flex;
  align-items: center;
  padding: 12px;

  color: $text;
  background: $surface;
  border-radius: 6px;
}
```

Do not force this split on every rule. Let the configured formatter own selector
wrapping, value notation and punctuation; Stylelint owns enforced style rules.
Keep focus-visible, hover, disabled and reduced-motion handling easy to find
without duplicating rules or changing styles.
