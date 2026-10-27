// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

import { declarationsForSelector } from '../../testUtils/stylesheetDeclarations';

const stylesheet = postcss.parse(
  compile(fileURLToPath(new URL('./personPage.scss', import.meta.url))).css
);

test('keeps a dark cinematic fallback and a non-interactive poster overlay', () => {
  expect(declarationsForSelector(stylesheet, '.person-hero')).toMatchObject({
    background: '#232323',
    'border-bottom': '10px solid #555555',
    isolation: 'isolate',
  });
  expect(
    declarationsForSelector(stylesheet, '.person-hero:after')
  ).toMatchObject({
    background: expect.stringContaining('linear-gradient('),
    'pointer-events': 'none',
  });
  expect(
    declarationsForSelector(stylesheet, '.person-hero__posters')
  ).toMatchObject({
    position: 'absolute',
    opacity: '0.38',
    'grid-auto-rows': 'minmax(0, 1fr)',
  });
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
