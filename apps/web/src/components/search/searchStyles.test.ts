// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

const stylesheet = postcss.parse(
  compile(fileURLToPath(new URL('./search.scss', import.meta.url))).css
);

test('preserves the original Search submit button width', () => {
  const declarations: Record<string, string> = {};
  stylesheet.walkRules((rule) => {
    if (
      rule.parent?.type !== 'root' ||
      !rule.selectors.includes('.header__search .btn')
    )
      return;
    rule.walkDecls((declaration) => {
      declarations[declaration.prop] = declaration.value;
    });
  });

  expect(declarations).toMatchObject({
    flex: '0 0 220px',
  });
  expect(declarations.height).toBeUndefined();
  expect(declarations['align-self']).toBeUndefined();
});

test('allows unbroken queries to wrap in result context and empty states', () => {
  const results = postcss.parse(
    compile(fileURLToPath(new URL('../list/list.scss', import.meta.url))).css
  );
  let wrapping: string | undefined;
  results.walkRules('.list__container', (rule) => {
    rule.walkDecls('overflow-wrap', (declaration) => {
      wrapping = declaration.value;
    });
  });
  expect(wrapping).toBe('anywhere');
});
