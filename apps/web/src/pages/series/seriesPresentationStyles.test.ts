// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

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

function declarations(
  stylesheet: postcss.Root,
  selector: string
): Record<string, string> {
  const values: Record<string, string> = {};
  stylesheet.walkRules((rule) => {
    if (rule.parent?.type !== 'root' || !rule.selectors.includes(selector)) {
      return;
    }
    rule.walkDecls((declaration) => {
      values[declaration.prop] = declaration.value;
    });
  });

  return values;
}

test('fills the Series content width with a responsive, clamped Cast grid', () => {
  expect(
    declarations(seriesStyles, '.series-credits .cast-grid')
  ).toMatchObject({
    display: 'grid',
    width: '100%',
    margin: '0',
    'grid-template-columns': expect.stringContaining('12.5% - 8.75px'),
  });
  expect(
    declarations(seriesStyles, '.series-credits .cast-grid')
  ).not.toHaveProperty('max-width');
  expect(
    declarations(seriesStyles, '.series-credits .cast-grid')
  ).not.toHaveProperty('margin-inline');
  expect(
    declarations(seriesStyles, '.series-credits .cast-member__image')
  ).toMatchObject({ 'max-width': 'none' });
  expect(
    declarations(seriesStyles, '.series-credits .cast-member p')
  ).toMatchObject({
    '-webkit-line-clamp': '2',
    'line-clamp': '2',
    overflow: 'hidden',
  });
});

test('styles Series creator links without an underline and keeps hover and focus states', () => {
  expect(
    declarations(seriesStyles, '.series-hero-metadata .series-people a')
  ).toMatchObject({
    color: 'inherit',
    'text-decoration': 'none',
  });
  expect(
    declarations(seriesStyles, '.series-hero-metadata .series-people a:hover')
  ).toMatchObject({ color: '#f65261' });
  expect(
    declarations(
      seriesStyles,
      '.series-hero-metadata .series-people a:focus-visible'
    )
  ).toMatchObject({ outline: '2px solid #f65261' });
});

test('aligns Series provider categories with the narrower metadata columns', () => {
  expect(
    declarations(seriesStyles, '.series-hero-metadata .watch-providers__groups')
  ).toMatchObject({
    'grid-template-columns': expect.stringContaining('140px'),
  });
});

test('uses available width for Series crew while preserving Movie two-column layout', () => {
  expect(
    declarations(mediaStyles, '.series-sections .crew-group__people')[
      'grid-template-columns'
    ]
  ).toContain('auto-fill');
  expect(declarations(mediaStyles, '.cast-crew-layout')).toMatchObject({
    display: 'grid',
    'grid-template-columns': 'minmax(0, 2.2fr) minmax(250px, 1fr)',
  });
});
