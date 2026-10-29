// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

import {
  declarationsForMedia,
  declarationsForSelector,
} from '../../testUtils/stylesheetDeclarations';

const stylesheet = postcss.parse(
  compile(fileURLToPath(new URL('./filter.scss', import.meta.url))).css
);

test('rounds the Sort By group and buttons without a local minimum height', () => {
  const group = declarationsForSelector(stylesheet, '.filter-sort-options');
  const buttons = declarationsForSelector(
    stylesheet,
    '.filter-sort-options button'
  );

  expect(group).toMatchObject({ 'border-radius': '10px' });
  expect(group).not.toHaveProperty('min-height');
  expect(buttons).toMatchObject({ 'border-radius': '8px' });
  expect(buttons).not.toHaveProperty('min-height');
});

test('transitions Sort By selection and disables it for reduced motion', () => {
  expect(
    declarationsForSelector(stylesheet, '.filter-sort-options button')
      .transition
  ).toBe('background-color 220ms ease, color 220ms ease');
  expect(
    declarationsForMedia(
      stylesheet,
      '.filter-sort-options button',
      '(prefers-reduced-motion: reduce)'
    ).transition
  ).toBe('none');
});

test('rounds Year Picker and Minimum Rating inputs without changing the slider', () => {
  expect(
    declarationsForSelector(stylesheet, '.filter-panel input[type=text]')[
      'border-radius'
    ]
  ).toBe('10px');
  expect(
    declarationsForSelector(stylesheet, '.filter-year-picker__trigger')[
      'border-radius'
    ]
  ).toBe('0 10px 10px 0');
  expect(
    declarationsForSelector(stylesheet, '.filter-rating__input')[
      'border-radius'
    ]
  ).toBe('10px');
  expect(
    declarationsForSelector(stylesheet, '.filter-panel input[type=range]')
  ).not.toHaveProperty('border-radius');
});
