// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss, { type Root } from 'postcss';

const stylesheet = postcss.parse(
  compile(fileURLToPath(new URL('./search.scss', import.meta.url))).css
);
const detailsStylesheet = postcss.parse(
  compile(fileURLToPath(new URL('../details/details.scss', import.meta.url)))
    .css
);
const appStylesheet = postcss.parse(
  compile(fileURLToPath(new URL('../../App.scss', import.meta.url))).css
);

function declarationsFor(styles: Root, selector: string, mediaQuery?: string) {
  const declarations: Record<string, string> = {};

  styles.walkRules((rule) => {
    if (!rule.selectors.includes(selector)) {
      return;
    }

    const { parent } = rule;
    const isMatchingScope = mediaQuery
      ? parent?.type === 'atrule' && parent.params === mediaQuery
      : parent?.type === 'root';

    if (isMatchingScope) {
      rule.walkDecls((declaration) => {
        declarations[declaration.prop] = declaration.value;
      });
    }
  });

  return declarations;
}

test('preserves the original Search submit button width', () => {
  const declarations: Record<string, string> = {};

  stylesheet.walkRules((rule) => {
    if (
      rule.parent?.type !== 'root' ||
      !rule.selectors.includes('.header__search .btn')
    )
      return;
    rule.walkDecls((declaration) => {
      declarations[declaration.prop] = declaration.value;
    });
  });

  expect(declarations).toMatchObject({
    flex: '0 0 220px',
  });
  expect(declarations.height).toBeUndefined();
  expect(declarations['align-self']).toBeUndefined();
});

test('preserves page-specific dark hero treatments without detail backdrops', () => {
  expect(declarationsFor(appStylesheet, '.header').background).toBe('#000000');
  expect(declarationsFor(appStylesheet, '.header')['border-bottom']).toContain(
    '10px'
  );
  expect(
    declarationsFor(detailsStylesheet, '.header--movie-details')
  ).not.toHaveProperty('background');
  expect(stylesheet.toString()).not.toContain('movie-posters-background.webp');
  expect(appStylesheet.toString()).toContain('movie-posters-background.webp');
  expect(declarationsFor(appStylesheet, '.header:before').opacity).toBe('0.1');
  expect(
    declarationsFor(appStylesheet, '.header:before', '(max-width: 767.98px)')[
      'background-image'
    ]
  ).toContain('movie-posters-background-mobile.webp');
  expect(
    declarationsFor(detailsStylesheet, '.header--movie-details:before').opacity
  ).toBe('0.1');
  expect(detailsStylesheet.toString()).not.toContain('detail-page__backdrop');
});

test('aligns shared Header, Search and detail content geometry', () => {
  const detailsPadding = declarationsFor(detailsStylesheet, '.movie-details');
  const appHeaderPadding = declarationsFor(appStylesheet, '.app-header__inner');

  expect(appHeaderPadding['min-height']).toBe('44px');
  expect(detailsPadding['padding-inline']).toBe('60px');
  expect(appHeaderPadding['padding-inline']).toBe('60px');
  expect(
    declarationsFor(
      appStylesheet,
      '.app-header__inner',
      '(width > 480px) and (width < 1200px)'
    )['padding-inline']
  ).toBe('0');
  expect(
    declarationsFor(appStylesheet, '.App--details > .app-header').background
  ).toBe('transparent');
  expect(
    declarationsFor(appStylesheet, '.App--details > .detail-page')['grid-area']
  ).toBe('1/1');
  expect(
    declarationsFor(appStylesheet, '.App--details > .route-loading')[
      'grid-area'
    ]
  ).toBe('1/1');
  expect(
    declarationsFor(appStylesheet, '.app-header--search .app-header__inner')
  ).toEqual({});
  expect(
    declarationsFor(appStylesheet, '.app-header--search .app-header__brand')
  ).toEqual({});

  [
    ['(max-width: 991.98px)', '20px'],
    ['(max-width: 767.98px)', '10px'],
  ].forEach(([mediaQuery, padding]) => {
    expect(
      declarationsFor(detailsStylesheet, '.movie-details', mediaQuery)[
        'padding-inline'
      ]
    ).toBe(padding);
  });

  expect(declarationsFor(stylesheet, '.header__title').padding).toBe(
    '114px 0 24px'
  );
  expect(declarationsFor(stylesheet, '.header__title')['margin-inline']).toBe(
    'clamp(32px, 8vw, 120px)'
  );
  expect(
    declarationsFor(stylesheet, '.header__title', '(max-width: 767.98px)')
      .padding
  ).toBe('80px 0 1rem');
  expect(
    declarationsFor(detailsStylesheet, '.detail-page__hero')['padding-top']
  ).toBe('100px');

  expect(declarationsFor(stylesheet, '.header__search')).toMatchObject({
    padding: '20px clamp(32px, 8vw, 120px) 56px',
    width: '100%',
  });
});

test('overlays expanded detail search over the brand only on narrow screens', () => {
  const mobileQuery = '(width <= 480px)';
  const mobileHeader = declarationsFor(
    appStylesheet,
    '.app-header__inner:has(> .detail-search)',
    mobileQuery
  );
  const collapsedSearch = declarationsFor(
    appStylesheet,
    '.app-header__inner:has(> .detail-search) > .detail-search',
    mobileQuery
  );
  const expandedHeader = declarationsFor(
    appStylesheet,
    '.app-header__inner:has(.detail-search__form--expanded)',
    mobileQuery
  );
  const expandedSearch = declarationsFor(
    appStylesheet,
    '.app-header__inner:has(.detail-search__form--expanded) > .detail-search',
    mobileQuery
  );

  expect(mobileHeader['padding-inline']).toBe('0');
  expect(collapsedSearch).toMatchObject({
    flex: '0 0 44px',
    'max-width': '44px',
    width: '44px',
  });
  expect(expandedHeader).toMatchObject({
    position: 'relative',
  });
  expect(expandedSearch).toMatchObject({
    'max-width': 'none',
    position: 'absolute',
    'inset-inline': '0',
    top: '0',
    width: 'auto',
    'z-index': '5',
  });
});

test('allows unbroken queries to wrap in result context and empty states', () => {
  const results = postcss.parse(
    compile(fileURLToPath(new URL('../list/list.scss', import.meta.url))).css
  );
  let wrapping: string | undefined;

  results.walkRules('.list__container', (rule) => {
    rule.walkDecls('overflow-wrap', (declaration) => {
      wrapping = declaration.value;
    });
  });
  expect(wrapping).toBe('anywhere');
});
