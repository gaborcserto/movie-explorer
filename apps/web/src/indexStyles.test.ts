// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

test('overrides reset smooth scrolling when reduced motion is requested', () => {
  const stylesheet = postcss.parse(
    compile(fileURLToPath(new URL('./index.scss', import.meta.url)), {
      loadPaths: [
        fileURLToPath(new URL('../../../node_modules', import.meta.url)),
      ],
    }).css
  );

  const scrollBehavior: { query: string; value: string }[] = [];
  stylesheet.walkRules('html:focus-within', (rule) => {
    rule.walkDecls('scroll-behavior', (declaration) => {
      const query = rule.parent?.type === 'atrule' ? rule.parent.params : 'all';
      scrollBehavior.push({ query, value: declaration.value });
    });
  });

  expect(scrollBehavior).toEqual([
    { query: 'all', value: 'smooth' },
    { query: '(prefers-reduced-motion: reduce)', value: 'auto' },
  ]);
});
