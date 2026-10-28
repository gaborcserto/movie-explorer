// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

import { declarationsForSelector } from '../../testUtils/stylesheetDeclarations';

const seriesStyles = postcss.parse(
  compile(fileURLToPath(new URL('./series.scss', import.meta.url))).css
);
const mediaStyles = postcss.parse(
  compile(
    fileURLToPath(
      new URL('../../components/details/media/media.scss', import.meta.url)
    )
  ).css
);

test('fills the Series content width with a responsive, clamped Cast grid', () => {
  expect(
    declarationsForSelector(seriesStyles, '.series-credits .cast-grid')
  ).toMatchObject({
    display: 'grid',
    width: '100%',
    margin: '0',
    'grid-template-columns': expect.stringContaining('12.5% - 8.75px'),
  });
  expect(
    declarationsForSelector(seriesStyles, '.series-credits .cast-grid')
  ).not.toHaveProperty('max-width');
  expect(
    declarationsForSelector(seriesStyles, '.series-credits .cast-grid')
  ).not.toHaveProperty('margin-inline');
  expect(
    declarationsForSelector(seriesStyles, '.series-credits .cast-member__image')
  ).toMatchObject({ 'max-width': 'none' });
  expect(
    declarationsForSelector(seriesStyles, '.series-credits .cast-member p')
  ).toMatchObject({
    '-webkit-line-clamp': '2',
    'line-clamp': '2',
    overflow: 'hidden',
  });
});

test('styles Series creator links without an underline and keeps hover and focus states', () => {
  expect(
    declarationsForSelector(
      seriesStyles,
      '.series-hero-metadata .series-people a'
    )
  ).toMatchObject({
    color: 'inherit',
    'text-decoration': 'none',
  });
  expect(
    declarationsForSelector(
      seriesStyles,
      '.series-hero-metadata .series-people a:hover'
    )
  ).toMatchObject({ color: '#f65261' });
  expect(
    declarationsForSelector(
      seriesStyles,
      '.series-hero-metadata .series-people a:focus-visible'
    )
  ).toMatchObject({ outline: '2px solid #f65261' });
});

test('aligns Series provider categories with the narrower metadata columns', () => {
  expect(
    declarationsForSelector(
      seriesStyles,
      '.series-hero-metadata .watch-providers__groups'
    )
  ).toMatchObject({
    'grid-template-columns': expect.stringContaining('140px'),
  });
});

test('uses available width for Series crew while preserving Movie two-column layout', () => {
  expect(
    declarationsForSelector(
      mediaStyles,
      '.series-sections .crew-group__people'
    )['grid-template-columns']
  ).toContain('auto-fill');
  expect(
    declarationsForSelector(mediaStyles, '.cast-crew-layout')
  ).toMatchObject({
    display: 'grid',
    'grid-template-columns': 'minmax(0, 2.2fr) minmax(250px, 1fr)',
  });
});
