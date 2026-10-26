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

## PHP and Laravel

Inspect Composer scripts, PHP_CodeSniffer/PHP-CS-Fixer configuration and
`pint.json` before selecting checks. Follow the project's chosen PSR-12 rules or
Pint preset; do not assume a Laravel/Pint preset is identical to PSR-12. Use the
installed formatter's supported check mode and existing project commands; do not
install Pint or impose PHP brace/indentation rules on TypeScript.

Keep namespace/use declarations, class members, controller actions, validation,
service calls and responses distinguishable with tool-compatible blank lines.
Retain attribute/docblock attachment, use aliases, constructor property promotion,
route registration, middleware and Eloquent query order. Preserve Blade text and
whitespace where it affects rendered output. Do not convert PHP syntax or extract
services during formatting.

Inside an existing action, before:

```php
$validated = $request->validated();
$movie = $this->movies->create($validated);
return response()->json($movie, 201);
```

After, if validation, persistence and HTTP response are useful boundaries:

```php
$validated = $request->validated();

$movie = $this->movies->create($validated);

return response()->json($movie, 201);
```

A very short action may read better without both blank lines. Accept the local
formatter's result; this example illustrates grouping rather than a mandatory
line count or an instruction to change the application's response contract.
