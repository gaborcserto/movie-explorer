// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

import {
  declarationsForMedia,
  declarationsForSelector,
} from '../../testUtils/stylesheetDeclarations';

const stylesheet = postcss.parse(
  compile(fileURLToPath(new URL('./animatedSelect.scss', import.meta.url))).css
);

test('styles the trigger, dropdown and options with matching rounded corners and coral states', () => {
  expect(
    declarationsForSelector(stylesheet, '.animated-select__trigger')
  ).toMatchObject({
    'border-radius': '10px',
    'min-height': '44px',
    transition: expect.stringContaining('border-color 220ms ease'),
  });
  expect(
    declarationsForSelector(stylesheet, '.animated-select__options')
  ).toMatchObject({
    'border-radius': '10px',
    opacity: '0',
    position: 'fixed',
    transform: 'translateY(-8px)',
    visibility: 'hidden',
    transition: expect.stringContaining('visibility 0s linear 220ms'),
  });
  expect(
    declarationsForSelector(stylesheet, '.animated-select__options').transform
  ).toBe('translateY(-8px)');
  expect(
    declarationsForSelector(
      stylesheet,
      '.animated-select__options[data-open=true]'
    )
  ).toMatchObject({
    opacity: '1',
    transform: 'translateY(0)',
    visibility: 'visible',
  });
  expect(
    declarationsForSelector(
      stylesheet,
      '.animated-select__options[data-placement=top]'
    ).transform
  ).toBe('translateY(8px)');
  expect(
    declarationsForSelector(
      stylesheet,
      '.animated-select__option[aria-selected=true]'
    )
  ).toMatchObject({ background: '#f65261', color: '#ffffff' });
  expect(
    declarationsForSelector(stylesheet, '.animated-select__chevron')
  ).toMatchObject({
    transform: 'rotate(45deg)',
    transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
  });
  expect(
    declarationsForSelector(
      stylesheet,
      '.animated-select__trigger[aria-expanded=true] .animated-select__chevron'
    ).transform
  ).toBe('rotate(225deg)');
});

test('disables decorative dropdown transitions when reduced motion is requested', () => {
  const query = '(prefers-reduced-motion: reduce)';

  [
    '.animated-select__trigger',
    '.animated-select__chevron',
    '.animated-select__options',
    '.animated-select__option',
  ].forEach((selector) => {
    expect(declarationsForMedia(stylesheet, selector, query).transition).toBe(
      'none'
    );
  });
});
