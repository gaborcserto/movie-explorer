// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

const stylesheet = postcss.parse(
  compile(fileURLToPath(new URL('./media.scss', import.meta.url))).css
);

function declarations(selector: string) {
  const values: Record<string, string> = {};
  stylesheet.walkRules((rule) => {
    if (rule.parent?.type !== 'root' || !rule.selectors.includes(selector))
      return;
    rule.walkDecls((declaration) => {
      values[declaration.prop] = declaration.value;
    });
  });
  return values;
}

function declarationsForMedia(selector: string, query: string) {
  const values: Record<string, string> = {};
  stylesheet.walkAtRules('media', (media) => {
    if (
      query.includes('prefers-reduced-motion')
        ? !media.params.includes(query)
        : media.params !== query
    )
      return;
    media.walkRules((rule) => {
      if (!rule.selectors.includes(selector)) return;
      rule.walkDecls((declaration) => {
        values[declaration.prop] = declaration.value;
      });
    });
  });
  return values;
}

test('keeps top Credits links muted with an invisible underline and a subtle transition', () => {
  expect(
    declarations('.movie-details__credits .person-credit-link')
  ).toMatchObject({
    color: 'rgba(255, 255, 255, 0.65)',
    'text-decoration-color': 'transparent',
    transition: 'color 180ms ease, text-decoration-color 180ms ease',
  });
});

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

test('uses a wrapping mobile grid with two columns when they fit and one on narrow screens', () => {
  const mediaRules: Array<{ query: string; columns?: string }> = [];
  stylesheet.walkAtRules('media', (media) => {
    if (
      !media.params.includes('max-width') &&
      !media.params.includes('width <=')
    )
      return;
    media.walkRules('.cast-grid', (rule) => {
      mediaRules.push({
        query: media.params,
        columns: rule.nodes
          ?.filter(
            (node) =>
              node.type === 'decl' && node.prop === 'grid-template-columns'
          )
          .map((node) => (node.type === 'decl' ? node.value : ''))
          .at(-1),
      });
    });
  });

  expect(mediaRules).toEqual([
    expect.objectContaining({
      query: '(max-width: 767.98px)',
      columns: 'repeat(2, minmax(0, 1fr))',
    }),
    expect.objectContaining({
      query: '(width <= 359px)',
      columns: 'minmax(0, 1fr)',
    }),
  ]);
  expect(declarations('.cast-grid')).toMatchObject({ display: 'grid' });
  expect(declarations('.cast-member')).toMatchObject({ 'min-width': '0' });
  expect(declarations('.cast-member__image')).toMatchObject({
    'aspect-ratio': '2/3',
    width: '100%',
  });
});

test.each(['hover', 'focus-visible'])(
  'shows coral text for credit links and Cast & Crew names on %s',
  (state) => {
    expect(
      declarations(`.movie-details__credits .person-credit-link:${state}`)
    ).toMatchObject({ color: '#f65261' });
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
  [
    '.movie-details__credits .person-credit-link:focus-visible',
    '.cast-member__link:focus-visible',
  ].forEach((selector) => {
    expect(declarations(selector).outline).toBe('2px solid #f65261');
    expect(declarations(selector)['outline-offset']).toMatch(/^[34]px$/);
  });
});

test('disables credit animations when reduced motion is requested', () => {
  const selectors: string[] = [];
  stylesheet.walkAtRules('media', (media) => {
    if (media.params !== '(prefers-reduced-motion: reduce)') return;
    media.walkRules((rule) => {
      rule.walkDecls('transition', (declaration) => {
        if (declaration.value === 'none') selectors.push(...rule.selectors);
      });
    });
  });
  expect(selectors).toContain('.movie-details__credits .person-credit-link');
  expect(selectors).toContain('.cast-member__link h3');
  expect(selectors).toContain('.cast-member');
  const reducedMotionTransform = declarationsForMedia(
    '.cast-member:hover',
    '(prefers-reduced-motion: reduce)'
  ).transform;
  expect(reducedMotionTransform).toBe('none');
});
