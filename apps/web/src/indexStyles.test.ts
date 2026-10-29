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

test('applies a shared coral transition and preserves visible focus on text links', () => {
  const stylesheet = postcss.parse(
    compile(fileURLToPath(new URL('./index.scss', import.meta.url)), {
      loadPaths: [
        fileURLToPath(new URL('../../../node_modules', import.meta.url)),
      ],
    }).css
  );
  const textLinkRules: Record<string, string> = {};
  stylesheet.walkRules('.text-link', (rule) => {
    if (rule.parent?.type === 'root') {
      rule.walkDecls((declaration) => {
        textLinkRules[declaration.prop] = declaration.value;
      });
    }
  });

  let hoverColor: string | undefined;

  stylesheet.walkRules('.text-link:hover', (rule) => {
    rule.walkDecls('color', (declaration) => {
      hoverColor = declaration.value;
    });
  });

  expect(textLinkRules.transition).toBe('color 200ms ease');
  expect(hoverColor).toBe('#f65261');

  let reducedMotionTransition: string | undefined;

  stylesheet.walkAtRules('media', (media) => {
    if (media.params === '(prefers-reduced-motion: reduce)') {
      media.walkRules('.text-link', (rule) => {
        rule.walkDecls('transition', (declaration) => {
          reducedMotionTransition = declaration.value;
        });
      });
    }
  });

  expect(reducedMotionTransition).toBe('none');
  expect(stylesheet.toString()).toContain('a:focus-visible');
});
