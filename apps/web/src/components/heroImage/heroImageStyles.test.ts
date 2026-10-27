// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

import { declarationsForSelector } from '../../testUtils/stylesheetDeclarations';

const movieStylesheet = postcss.parse(
  compile(fileURLToPath(new URL('../details/details.scss', import.meta.url)))
    .css
);
const personStylesheet = postcss.parse(
  compile(
    fileURLToPath(
      new URL('../../pages/personPage/personPage.scss', import.meta.url)
    )
  ).css
);
const interactionStylesheet = postcss.parse(
  compile(fileURLToPath(new URL('./heroImage.scss', import.meta.url))).css
);

const heroImages = [
  {
    name: 'Movie Details poster',
    stylesheet: movieStylesheet,
    selector: '.movie-details__image',
  },
  {
    name: 'Person Details portrait',
    stylesheet: personStylesheet,
    selector: '.person-profile__portrait',
  },
];

test.each(heroImages)(
  '$name uses the shared layered neutral light shadow',
  ({ stylesheet, selector }) => {
    const shadow = declarationsForSelector(stylesheet, selector)['box-shadow'];
    expect(shadow).toContain('0 24px 32px -6px rgba(0, 0, 0, 0.58)');
    expect(shadow).toContain('0 14px 20px -4px rgba(0, 0, 0, 0.42)');
    expect(shadow).toContain('0 5px 8px -2px rgba(0, 0, 0, 0.3)');
    expect(shadow).toContain('0 18px 28px -12px rgba(220, 228, 238, 0.24)');
    expect(shadow).not.toContain('246, 82, 97');
    expect(
      stylesheet.nodes?.some(
        (node) =>
          node.type === 'rule' && node.selectors.includes(`${selector}:before`)
      )
    ).toBe(false);
  }
);

test('both detail hero images have matching ten pixel rounded corners', () => {
  expect(
    declarationsForSelector(movieStylesheet, '.movie-details__image')
  ).toMatchObject({
    'border-radius': '10px',
  });
  expect(
    declarationsForSelector(personStylesheet, '.person-profile__portrait')
  ).toMatchObject({ 'border-radius': '10px' });
});

test('hero images have visible keyboard focus and reduced-motion hover behavior', () => {
  const selectors = new Set<string>();

  interactionStylesheet.walkRules((rule) => {
    selectors.add(rule.selector);
  });
  expect(selectors).toContain('.hero-image:focus-visible');
  expect(selectors).toContain('.hero-image--loaded:hover');
  expect(selectors).toContain(
    '.hero-image--loaded:focus-visible .hero-image__media__img'
  );
  const hover = interactionStylesheet.nodes?.find(
    (node) =>
      node.type === 'atrule' &&
      node.params === '(hover: hover) and (pointer: fine)'
  );
  let hoverShadow = '';
  let hoverTransform = '';

  if (hover?.type === 'atrule') {
    hover.walkRules((rule) => {
      if (!rule.selectors.includes('.hero-image--loaded:hover')) {
        return;
      }
      rule.walkDecls('box-shadow', (declaration) => {
        hoverShadow = declaration.value;
      });
      rule.walkDecls('transform', (declaration) => {
        hoverTransform = declaration.value;
      });
    });
  }
  expect(hoverShadow).toContain('rgba(220, 228, 238, 0.38)');
  expect(hoverShadow).not.toContain('246, 82, 97');
  expect(hoverTransform).toBe('scale(1.06)');
  expect(
    declarationsForSelector(interactionStylesheet, '.hero-image')
  ).toMatchObject({
    transition: expect.stringContaining('box-shadow 0.24s ease'),
  });
  let reducedMotionHoverTransform: string | undefined;

  interactionStylesheet.walkAtRules('media', (media) => {
    if (media.params !== '(prefers-reduced-motion: reduce)') {
      return;
    }
    media.walkRules((rule) => {
      if (!rule.selectors.includes('.hero-image--loaded:hover')) {
        return;
      }
      rule.walkDecls('transform', (declaration) => {
        reducedMotionHoverTransform = declaration.value;
      });
    });
  });
  expect(reducedMotionHoverTransform).toBe('none');
});
