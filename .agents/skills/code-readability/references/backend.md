# Backend readability

## TypeScript, NestJS and Node.js

- Always put exactly one blank line between a completed variable declaration
  or contiguous declaration group and a following `if`, `try`, `for`, `while`
  or `switch` that starts the next logical operation. Keep consecutive
  declarations adjacent. ESLint can require at least one line for these
  statement selectors, but cannot distinguish independent work from tight
  coupling or cap the gap at one line; formatting and review enforce those
  details.
- Put exactly one blank line before a return when it follows a separate
  operation or a completed control-flow block. A return that is first in its
  block needs no padding; keep closely coupled short guards together. ESLint can
  enforce padding before returns that are not first in their block, but it
  cannot determine logical intent or cap the whitespace at one blank line.

- Keep class fields, dependency injection construction and methods visually
  distinct. Use one blank line between methods, with decorators and explanatory
  comments attached to the method they describe. Do not reorder members, change
  visibility or convert constructor parameter properties.
- Keep thin controllers and service delegation compact. Separate validation,
  integration requests, mapping and responses inside larger methods when they
  are distinct phases. Do not create helper methods just to shorten a block.
- Inside methods, separate guard clauses from the next distinct operation, setup
  from a subsequent request or other operation, and a final value or cleanup
  return from preceding work with one blank line where those phases differ. Keep
  tightly coupled statements together; do not space every statement.
- Keep each DTO property's validation, transformation and documentation
  decorators together; separate property groups with one blank line. Preserve
  decorator order, initializers, defaults and emitted runtime metadata.
- Public methods often precede private helpers in new code; preserve existing
  member order during formatting. Do not normalize return annotations or async
  signatures as a visual change.
- In provider code, keep request inputs together and separate them from response
  mapping and errors. Retain exception types, sensitive-data boundaries, retry
  policies, concurrency, caching and logging behavior.
- Group fixture fields by meaning only where member order is safe and the task
  permits it; otherwise use existing order. Do not move test setup into production.

Before:

```ts
public findOne(id: number) {
  return this.provider.findOne(id);
}
public findRelated(id: number) {
  return this.provider.findRelated(id);
}
```

Within a method, a guard, request setup, external operation and final return can
be visually separated without changing their order:

```ts
async findMovie(id: number) {
  if (!id) return undefined;

  const options = this.createOptions();

  const movie = await this.provider.findOne(id, options);

  return movie;
}
```

After:

```ts
public findOne(id: number) {
  return this.provider.findOne(id);
}

public findRelated(id: number) {
  return this.provider.findRelated(id);
}
```
