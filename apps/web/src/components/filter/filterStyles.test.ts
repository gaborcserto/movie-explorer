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

test('rounds the Sort By group and only the active button without a local minimum height', () => {
  const group = declarationsForSelector(stylesheet, '.filter-sort-options');
  const buttons = declarationsForSelector(
    stylesheet,
    '.filter-sort-options button'
  );
  const activeButton = declarationsForSelector(
    stylesheet,
    '.filter-sort-options button[aria-pressed=true]'
  );

  expect(group).toMatchObject({ 'border-radius': '10px' });
  expect(group).not.toHaveProperty('min-height');
  expect(buttons).toMatchObject({ 'border-radius': '0' });
  expect(buttons).not.toHaveProperty('min-height');
  expect(activeButton).toMatchObject({
    'border-radius': '8px',
    background: '#f65261',
    color: '#ffffff',
  });
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

test('animates the Release Year picker in both directions and respects reduced motion', () => {
  const dropdown = declarationsForSelector(
    stylesheet,
    '.filter-year-picker__list'
  );

  expect(dropdown).toMatchObject({
    'border-radius': '10px',
    opacity: '0',
    transform: 'translateY(-8px)',
    visibility: 'hidden',
    transition: expect.stringContaining('opacity 220ms ease'),
  });
  expect(
    declarationsForSelector(
      stylesheet,
      '.filter-year-picker__list[data-placement=top]'
    )
  ).toMatchObject({ transform: 'translateY(8px)' });
  expect(
    declarationsForSelector(
      stylesheet,
      '.filter-year-picker__list[data-open=true]'
    )
  ).toMatchObject({
    opacity: '1',
    transform: 'translateY(0)',
    visibility: 'visible',
  });
  expect(
    declarationsForMedia(
      stylesheet,
      '.filter-year-picker__list',
      '(prefers-reduced-motion: reduce)'
    ).transition
  ).toBe('none');
});

test('mobile trigger centers its flex children at full width', () => {
  const base: Record<string, string> = {};
  const mobile: Record<string, string> = {};

  stylesheet.walkRules('.movie-filters__trigger', (rule) => {
    rule.walkDecls((decl) => {
      const target = rule.parent?.type === 'atrule' ? mobile : base;
      target[decl.prop] = decl.value;
    });
  });

  expect(base).toMatchObject({ display: 'flex', 'align-items': 'center' });
  expect(mobile).toMatchObject({
    width: '100%',
    'justify-content': 'center',
    'text-align': 'center',
  });
});

test('genre hover changes color without underlining and keeps visible focus', () => {
  const hover: Record<string, string> = {};
  const focus: Record<string, string> = {};

  stylesheet.walkRules('.filter-genres__available button:hover', (rule) => {
    rule.walkDecls((decl) => {
      hover[decl.prop] = decl.value;
    });
  });
  stylesheet.walkRules('.movie-filters button:focus-visible', (rule) => {
    rule.walkDecls((decl) => {
      focus[decl.prop] = decl.value;
    });
  });

  expect(hover['text-decoration']).toBe('none');
  expect(hover.color).toBe('#f65261');
  expect(focus.outline).toBe('2px solid #f65261');
  expect(focus['outline-offset']).toBe('3px');
});
