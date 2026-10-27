// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

import { declarationsForSelector } from '../../testUtils/stylesheetDeclarations';

const stylesheet = postcss.parse(
  compile(fileURLToPath(new URL('./footer.scss', import.meta.url))).css
);

test('keeps footer attribution links plain until hover or keyboard focus', () => {
  expect(
    declarationsForSelector(stylesheet, '.footer__attribution a')
  ).toMatchObject({
    color: 'inherit',
    'text-decoration': 'none',
    'text-underline-offset': '2px',
  });
  expect(
    declarationsForSelector(stylesheet, '.footer__attribution a:hover')[
      'text-decoration'
    ]
  ).toBe('underline');
  expect(
    declarationsForSelector(stylesheet, '.footer__attribution a:focus-visible')
  ).toMatchObject({ 'text-decoration': 'underline' });
  expect(
    declarationsForSelector(stylesheet, '.footer__attribution a:focus-visible')
  ).not.toHaveProperty('outline');
});
