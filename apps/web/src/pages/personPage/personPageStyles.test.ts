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
const searchStylesheet = postcss.parse(
  compile(
    fileURLToPath(
      new URL('../../components/search/search.scss', import.meta.url)
    )
  ).css
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
    declarationsForSelector(searchStylesheet, '.header:before')
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
  expect(declarationsForSelector(stylesheet, '.person-profile')).toMatchObject({
    display: 'flex',
    gap: '60px',
  });
  expect(
    declarationsForSelector(stylesheet, '.person-profile__portrait')
  ).toMatchObject({
    'border-radius': '10px',
    'aspect-ratio': '2/3',
    height: 'auto',
    flex: '0 0 320px',
    width: '320px',
  });
  expect(
    declarationsForSelector(stylesheet, '.person-profile h1')
  ).toMatchObject({
    'font-size': 'clamp(30px, 4vw, 40px)',
    'font-weight': '300',
    'letter-spacing': '1px',
    'line-height': '1.25',
    'overflow-wrap': 'anywhere',
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
