// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

import { declarationsForSelector } from '../../testUtils/stylesheetDeclarations';

const stylesheet = postcss.parse(
  compile(fileURLToPath(new URL('./skeleton.scss', import.meta.url))).css
);

test('uses a dark token, reserved poster proportions and disables pulse for reduced motion', () => {
  expect(declarationsForSelector(stylesheet, '.skeleton')).toMatchObject({
    background: '#424242',
    animation: 'skeleton-pulse 1.8s ease-in-out infinite',
    'max-width': '100%',
    'pointer-events': 'none',
  });
  expect(
    declarationsForSelector(stylesheet, '.skeleton-card__poster')
  ).toMatchObject({
    'aspect-ratio': '2/3',
    height: 'auto',
  });
  let reducedMotion = false;
  stylesheet.walkAtRules('media', (media) => {
    if (media.params === '(prefers-reduced-motion: reduce)') {
      media.walkDecls('animation', (declaration) => {
        reducedMotion = declaration.value === 'none';
      });
    }
  });
  expect(reducedMotion).toBe(true);
});
