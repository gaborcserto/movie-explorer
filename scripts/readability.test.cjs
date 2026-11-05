const { test } = require('node:test');
const assert = require('node:assert/strict');
const { boundaries, format } = require('./readability.cjs');

test('separates function values, named functions, methods, control flow and returns', () => {
  for (const code of [
    'const x = 1;\nconst f = () => x;',
    'const f = async () => {};\nconst g = function* () {};',
    'function a() {}\nfunction b() {}',
    'class A { a() {}\nb() {} }',
    'function a() { const x = 1;\nif (x) {}\nreturn x; }',
    'export const a = () => {};\nexport const b = () => {};',
    "import x from 'x';\nimport y from './y';",
  ]) {
    assert.ok(boundaries(code).length);
    assert.equal(boundaries(format(code)).length, 0);
    assert.equal(format(format(code)), format(code));
  }
});

test('preserves related declarations, inline callbacks, comments and first returns', () => {
  for (const code of [
    'const x = 1;\nconst y = x + 1;',
    'items.map(() => { return 1; });',
    'const x = 1;\n// attached comment\nconst f = () => x;',
    'function f() { return 1; }',
    'const x = 1;\n\nconst f = () => x;',
    "import 'side-effect';\nimport y from './y';",
  ]) {
    assert.equal(format(code), code);
  }
});

test('preserves CRLF and indentation, collapses excessive padding', () => {
  const code = 'function f() {\r\n  const x = 1;\r\n\r\n\r\n  return x;\r\n}';
  assert.equal(format(code), code.replace('\r\n\r\n\r\n', '\r\n\r\n'));
});

test('keeps overload signatures with their implementation', () => {
  const code =
    'function f(x: string): string;\nfunction f(x: string) { return x; }';

  assert.equal(format(code), code);
});

test('preserves directives, decorators, comments and import evaluation order', () => {
  const code =
    "'use client';\nimport 'first';\nimport x from 'package';\nimport y from './local';\nclass A {\n  first() {}\n  @decorator\n  second() {}\n}";
  const result = format(code);

  assert.equal(result.replace(/\s/g, ''), code.replace(/\s/g, ''));
  assert.equal(format(result), result);
});

test('rejects parse errors instead of claiming inspection succeeded', () => {
  assert.throws(() => boundaries('const = ;'), SyntaxError);
});

test('separates multiline callback hooks and identifiable memoized functions', () => {
  for (const declaration of [
    'useCallback(\n  (signal: AbortSignal) => getSeason(id, signal),\n  [id]\n)',
    'React.useCallback(async () => load(), [id])',
    'useMemo(() => () => load(), [id])',
    'useMemo(() => { return function () {}; }, [])',
    '(() => () => load())',
  ]) {
    const code = `const first = useCallback(() => load(), []);\nconst second = ${declaration};`;

    assert.equal(boundaries(code).length, 1);
    assert.equal(boundaries(format(code)).length, 0);
    assert.equal(format(format(code)), format(code));
  }
});

test('keeps value hooks and unidentifiable factory calls grouped', () => {
  for (const declaration of [
    'useState(false)',
    'useRef(null)',
    'useMemo(() => items.map(item => item.id), [items])',
    'useMemo(() => { function helper() {} return 1; }, [])',
    'createCallback(options)',
  ]) {
    const code = `const first = 1;\nconst second = ${declaration};`;

    assert.equal(format(code), code);
  }
});
