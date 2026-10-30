// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

import {
  declarationsForMedia,
  declarationsForSelector,
} from './testUtils/stylesheetDeclarations';

const stylesheet = postcss.parse(
  compile(fileURLToPath(new URL('./App.scss', import.meta.url))).css
);

test('uses the shared coral outline action sizing, shape, and typography', () => {
  expect(declarationsForSelector(stylesheet, '.btn--outline')).toMatchObject({
    'background-color': 'transparent',
    'border-color': '#f65261',
    'box-shadow': '0 5px 15px 0 rgba(0, 0, 0, 0.15)',
    color: '#f65261',
    'text-transform': 'none',
  });
  expect(declarationsForSelector(stylesheet, '.btn--action')).toMatchObject({
    'border-radius': '4px',
    'font-size': '14px',
    'min-height': '40px',
    'min-width': '108px',
    padding: '9px 14px',
    'text-transform': 'none',
  });
  expect(
    declarationsForSelector(stylesheet, '.btn--action:hover')
  ).toMatchObject({
    background: 'rgba(246, 82, 97, 0.14)',
    'border-color': '#f65261',
    color: '#f65261',
  });

  expect(
    declarationsForSelector(stylesheet, '.btn--action:focus-visible')
  ).toMatchObject({
    outline: '2px solid #f65261',
    'outline-offset': '3px',
  });
});

test('uses a transparent coral outline button with normal case text', () => {
  expect(declarationsForSelector(stylesheet, '.btn--outline')).toMatchObject({
    'background-color': 'transparent',
    'border-color': '#f65261',
    'box-shadow': '0 5px 15px 0 rgba(0, 0, 0, 0.15)',
    color: '#f65261',
    'text-transform': 'none',
  });
});

test('transitions stable tab panel heights and disables that transition for reduced motion', () => {
  expect(
    declarationsForSelector(stylesheet, '.tab-panel-stable').transition
  ).toBe('min-height 220ms ease');
  expect(
    declarationsForMedia(
      stylesheet,
      '.tab-panel-stable',
      '(prefers-reduced-motion: reduce)'
    ).transition
  ).toBe('none');
});
