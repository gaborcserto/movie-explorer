// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

import { declarationsForSelector } from '../../testUtils/stylesheetDeclarations';

const stylesheet = postcss.parse(
  compile(fileURLToPath(new URL('./suggestions.scss', import.meta.url))).css
);

test('clips suggestion poster and profile thumbnails with 10px corners', () => {
  expect(
    declarationsForSelector(stylesheet, '.search-suggestions__image')
  ).toMatchObject({
    'border-radius': '10px',
    overflow: 'hidden',
  });
  expect(
    declarationsForSelector(stylesheet, '.search-suggestions__image img')[
      'border-radius'
    ]
  ).toBe('10px');
});
