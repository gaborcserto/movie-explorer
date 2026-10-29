// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

import { declarationsForSelector } from '../../testUtils/stylesheetDeclarations';

const stylesheet = postcss.parse(
  compile(fileURLToPath(new URL('./personPage.scss', import.meta.url))).css
);
const detailStylesheet = postcss.parse(
  compile(
    fileURLToPath(
      new URL('../../components/details/details.scss', import.meta.url)
    )
  ).css
);
const appStylesheet = postcss.parse(
  compile(fileURLToPath(new URL('../../App.scss', import.meta.url))).css
);
test('reuses the shared cinematic background for the Person hero', () => {
  expect(declarationsForSelector(stylesheet, '.person-hero')).toMatchObject({
    'border-bottom': '10px solid #555555',
    isolation: 'isolate',
    overflow: 'hidden',
    position: 'relative',
  });
  expect(
    declarationsForSelector(stylesheet, '.person-hero')
  ).not.toHaveProperty('background');
  expect(
    declarationsForSelector(stylesheet, '.person-hero.header:before').content
  ).toBeUndefined();
  expect(declarationsForSelector(stylesheet, '.person-hero:after')).toEqual({});
  expect(stylesheet.toString()).not.toContain('person-hero__posters');
  expect(
    declarationsForSelector(appStylesheet, '.header:before')
  ).toMatchObject({
    'background-position': '50% 0',
    'background-size': 'cover',
    filter: 'blur(4.0774px)',
    opacity: '0.1',
  });
  expect(
    declarationsForSelector(detailStylesheet, '.header--movie-details:before')
      .opacity
  ).toBe('0.1');
  expect(detailStylesheet.toString()).not.toContain('detail-page__backdrop');
});

test('matches the movie title typography and preserves a ten pixel portrait radius', () => {
  expect(
    declarationsForSelector(detailStylesheet, '.movie-details__container')
  ).toMatchObject({ display: 'flex', gap: '60px', 'padding-bottom': '30px' });
  expect(
    declarationsForSelector(stylesheet, '.person-profile__portrait')
  ).toMatchObject({
    'border-radius': '10px',
  });
  expect(
    declarationsForSelector(stylesheet, '.person-profile h1')
  ).toMatchObject({
    'font-size': 'clamp(30px, 4vw, 40px)',
    'font-weight': '300',
    'letter-spacing': '1px',
    'line-height': '1.25',
    'overflow-wrap': 'anywhere',
    'text-transform': 'none',
  });
  expect(
    declarationsForSelector(stylesheet, '.person-profile__metadata dt')
  ).toMatchObject({
    color: '#f65261',
    'text-transform': 'uppercase',
  });
  expect(
    declarationsForSelector(stylesheet, '.person-profile__biography')
  ).toMatchObject({
    color: 'rgba(255, 255, 255, 0.65)',
    'font-size': '20px',
    'font-weight': '300',
    'line-height': '1.45',
  });
  expect(
    declarationsForSelector(stylesheet, '.person-profile section .btn--action')
  ).toMatchObject({
    'margin-top': '14px',
  });
});

test('keeps the loading profile geometry while sharing the successful hero geometry', () => {
  expect(
    declarationsForSelector(stylesheet, '.person-profile--loading')
  ).toMatchObject({ display: 'flex', gap: '60px', 'padding-bottom': '30px' });
  expect(
    declarationsForSelector(detailStylesheet, '.movie-details__image')
  ).toMatchObject({ width: '320px', flex: '0 0 320px', 'aspect-ratio': '2/3' });
});

test('keeps the person name and biography readable in the mobile layout', () => {
  const mobileDeclarations = new Map<string, Record<string, string>>();
  stylesheet.walkAtRules('media', (media) => {
    if (media.params !== '(max-width: 767.98px)') {
      return;
    }
    media.walkRules((rule) => {
      const values: Record<string, string> = {};
      rule.walkDecls((declaration) => {
        values[declaration.prop] = declaration.value;
      });
      mobileDeclarations.set(rule.selector, values);
    });
  });

  expect(mobileDeclarations.get('.person-profile h1')?.['font-size']).toBe(
    '24px'
  );
  expect(
    mobileDeclarations.get('.person-profile__biography')?.['font-size']
  ).toBe('18px');
});
