// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

import {
  declarationsForMedia as findDeclarationsForMedia,
  declarationsForSelector,
} from '../../../testUtils/stylesheetDeclarations';

const stylesheet = postcss.parse(
  compile(fileURLToPath(new URL('./media.scss', import.meta.url))).css
);
const globalStylesheet = postcss.parse(
  compile(fileURLToPath(new URL('../../../index.scss', import.meta.url)), {
    loadPaths: [
      fileURLToPath(new URL('../../../../../../node_modules', import.meta.url)),
    ],
  }).css
);

const declarations = (selector: string) =>
  declarationsForSelector(stylesheet, selector);
const declarationsForMedia = (selector: string, query: string) =>
  findDeclarationsForMedia(stylesheet, selector, query);

test('keeps all card names coral and role labels muted without changing typography', () => {
  expect(declarations('.cast-member h3')).toMatchObject({
    color: '#f65261',
    'font-size': '15px',
    'font-weight': '600',
    'line-height': '1.3',
  });
  expect(declarations('.cast-member__link h3').color).toBeUndefined();
  expect(declarations('.cast-member p')).toMatchObject({
    color: 'rgba(255, 255, 255, 0.55)',
    'font-size': '13px',
  });
  expect(declarations('.cast-member__link h3')['text-decoration']).toBe('none');
  expect(
    declarationsForMedia(
      '.cast-member:hover',
      '(hover: hover) and (pointer: fine)'
    )
  ).toMatchObject({
    filter: 'saturate(1.2)',
    transform: 'scale(1.06)',
  });
  expect(declarations('.cast-member')).toMatchObject({
    'transform-origin': 'center top',
    transition: 'transform 0.24s ease, filter 0.24s ease',
  });
  expect(declarations('.cast-member__link h3')['text-decoration']).toBe('none');
  expect(
    declarationsForMedia(
      '.cast-member:hover .cast-member__image',
      '(hover: hover) and (pointer: fine)'
    )['box-shadow']
  ).toBe('0 16px 30px rgba(0, 0, 0, 0.32)');
});

test('uses five desktop columns, four tablet columns and horizontal Cast scrolling on mobile', () => {
  const mediaRules: Array<{ query: string; display?: string }> = [];
  stylesheet.walkAtRules('media', (media) => {
    if (!media.params.includes('max-width')) {
      return;
    }
    media.walkRules('.cast-grid', (rule) => {
      mediaRules.push({
        query: media.params,
        display: rule.nodes
          ?.filter((node) => node.type === 'decl' && node.prop === 'display')
          .map((node) => (node.type === 'decl' ? node.value : ''))
          .at(-1),
      });
    });
  });

  expect(mediaRules.map(({ query }) => query)).toEqual([
    '(max-width: 991.98px)',
    '(max-width: 767.98px)',
  ]);
  expect(mediaRules[1].display).toBe('flex');
  expect(declarations('.cast-grid')).toMatchObject({
    display: 'grid',
    'grid-template-columns': 'repeat(5, minmax(0, 1fr))',
  });
  expect(
    declarationsForMedia('.cast-grid', '(max-width: 991.98px)')
  ).toMatchObject({
    'grid-template-columns': 'repeat(4, minmax(0, 1fr))',
  });
  expect(
    declarationsForMedia('.cast-grid', '(max-width: 767.98px)')
  ).toMatchObject({
    display: 'flex',
    'overflow-x': 'auto',
    'overscroll-behavior-x': 'contain',
    'scroll-snap-type': 'x proximity',
    'scrollbar-width': 'none',
  });
  expect(
    declarationsForMedia('.cast-member', '(max-width: 767.98px)')
  ).toMatchObject({ flex: '0 0 148px', 'scroll-snap-align': 'start' });
  expect(declarations('.cast-member')).toMatchObject({ 'min-width': '0' });
  expect(declarations('.cast-member__image')).toMatchObject({
    'aspect-ratio': '2/3',
    'border-radius': '10px',
    width: '100%',
  });
  expect(declarations('.cast-member__image__img')['border-radius']).toBe(
    '10px'
  );
});

test.each(['hover', 'focus-visible'])(
  'shows coral text for Cast & Crew names on %s',
  (state) => {
    const castSelector =
      state === 'hover'
        ? '.cast-member:hover h3'
        : '.cast-member:focus-within h3';
    const castDeclarations =
      state === 'hover'
        ? declarationsForMedia(
            castSelector,
            '(hover: hover) and (pointer: fine)'
          )
        : declarations(castSelector);
    expect(castDeclarations).toMatchObject({ color: '#f65261' });
  }
);

test('provides visible focus outlines on summary and complete card links', () => {
  ['.cast-member__link:focus-visible'].forEach((selector) => {
    expect(declarations(selector).outline).toBe('2px solid #f65261');
    expect(declarations(selector)['outline-offset']).toMatch(/^[34]px$/);
  });
});

test('disables Cast animations when reduced motion is requested', () => {
  const selectors: string[] = [];
  stylesheet.walkAtRules('media', (media) => {
    if (media.params !== '(prefers-reduced-motion: reduce)') {
      return;
    }
    media.walkRules((rule) => {
      rule.walkDecls('transition', (declaration) => {
        if (declaration.value === 'none') {
          selectors.push(...rule.selectors);
        }
      });
    });
  });
  expect(selectors).toContain('.cast-member__link h3');
  expect(selectors).toContain('.cast-member');
  const reducedMotionTransform = declarationsForMedia(
    '.cast-member:hover',
    '(prefers-reduced-motion: reduce)'
  ).transform;
  expect(reducedMotionTransform).toBe('none');
});

test('uses a larger desktop Cast column and a responsive Crew sidebar', () => {
  expect(declarations('.details-tabs')).toMatchObject({
    display: 'flex',
    'overflow-x': 'auto',
    'overscroll-behavior-x': 'contain',
  });
  expect(declarations('.cast-crew-layout')).toMatchObject({
    display: 'grid',
    gap: '32px',
    'grid-template-columns': 'minmax(0, 2.2fr) minmax(250px, 1fr)',
  });
  expect(
    declarationsForMedia('.cast-crew-layout', '(max-width: 991.98px)')[
      'grid-template-columns'
    ]
  ).toBe('minmax(0, 1fr)');
  expect(declarations('.cast-grid')['grid-template-columns']).toBe(
    'repeat(5, minmax(0, 1fr))'
  );
  expect(
    declarationsForMedia('.cast-grid', '(max-width: 991.98px)')[
      'grid-template-columns'
    ]
  ).toBe('repeat(4, minmax(0, 1fr))');
});

test('uses compact Crew name grids, neutral links and visible focus', () => {
  expect(declarations('.crew-group__people')).toMatchObject({
    display: 'grid',
    'grid-template-columns': 'repeat(2, minmax(0, 1fr))',
  });
  expect(declarations('.crew-group + .crew-group')).toMatchObject({
    'border-top': '1px solid rgba(255, 255, 255, 0.1)',
  });
  expect(declarations('.crew-group .person-credit-link').color).toBe(
    'rgba(255, 255, 255, 0.72)'
  );
  expect(
    declarations('.crew-group .person-credit-link')['text-decoration']
  ).toBe('none');
  const textLinkHoverColors: string[] = [];
  globalStylesheet.walkRules('.text-link:hover', (rule) => {
    rule.walkDecls('color', (declaration) => {
      textLinkHoverColors.push(declaration.value);
    });
  });
  expect(textLinkHoverColors).toContain('#f65261');
  expect(
    declarations('.crew-group .person-credit-link:focus-visible').outline
  ).toBe('2px solid #f65261');
  expect(
    declarationsForMedia(
      '.crew-group .person-credit-link',
      '(prefers-reduced-motion: reduce)'
    ).transition
  ).toBe('none');
  expect(declarations('.crew-group h3').color).toBe('#f65261');
});
