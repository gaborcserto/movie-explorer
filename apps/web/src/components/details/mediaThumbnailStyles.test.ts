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

test.each(['.photo-tile', '.video-tile'])(
  'matches Movie Card outer-card hover behavior for %s',
  (tileSelector) => {
    const imageSelector = `${tileSelector} img`;
    expect(declarations(tileSelector)).toMatchObject({
      'transform-origin': 'center top',
      transition: 'transform 0.24s ease, filter 0.24s ease',
    });
    expect(declarations(tileSelector)).toMatchObject({
      'border-radius': '4px',
      overflow: 'hidden',
    });
    expect(declarations(imageSelector).transform).toBeUndefined();
    expect(
      declarationsForMedia(
        `${tileSelector}:hover`,
        '(hover: hover) and (pointer: fine)'
      )
    ).toMatchObject({
      filter: 'saturate(1.2)',
      transform: 'scale(1.06)',
      'z-index': '3',
    });
    expect(declarations(`${tileSelector}:focus-visible`)).toMatchObject({
      outline: '2px solid #f65261',
      'outline-offset': '3px',
      'z-index': '2',
    });
  }
);

test('preserves thumbnail aspect ratios and disables scaling for reduced motion', () => {
  expect(declarations('.photo-tile')['aspect-ratio']).toBe('16/9');
  expect(declarations('.video-tile img')['aspect-ratio']).toBe('16/9');
  expect(declarations('.video-tile img').height).toBe('auto');

  ['.photo-tile', '.video-tile'].forEach((selector) => {
    expect(
      declarationsForMedia(selector, '(prefers-reduced-motion: reduce)')
        .transition
    ).toBe('none');
  });
  ['.photo-tile:hover', '.video-tile:hover'].forEach((selector) => {
    expect(
      declarationsForMedia(selector, '(prefers-reduced-motion: reduce)')
        .transform
    ).toBe('none');
  });
});

test('uses six backdrop, ten portrait and four video columns on desktop', () => {
  expect(declarations('.photo-grid:not(.photo-grid--portraits)')).toMatchObject(
    {
      'grid-template-columns': 'repeat(6, minmax(0, 1fr))',
    }
  );
  expect(declarations('.photo-grid--portraits')).toMatchObject({
    'grid-template-columns': 'repeat(10, minmax(0, 1fr))',
  });
  expect(declarations('.video-grid')).toMatchObject({
    'grid-template-columns': 'repeat(4, minmax(0, 1fr))',
  });
  expect(declarations('.photo-grid')).toMatchObject({ gap: '12px' });
});

test('reduces media columns at tablet and mobile widths', () => {
  expect(
    declarationsForMedia(
      '.photo-grid:not(.photo-grid--portraits)',
      '(max-width: 991.98px)'
    )['grid-template-columns']
  ).toBe('repeat(3, minmax(0, 1fr))');
  expect(
    declarationsForMedia('.photo-grid--portraits', '(max-width: 991.98px)')[
      'grid-template-columns'
    ]
  ).toBe('repeat(5, minmax(0, 1fr))');
  expect(
    declarationsForMedia('.video-grid', '(max-width: 991.98px)')[
      'grid-template-columns'
    ]
  ).toBe('repeat(2, minmax(0, 1fr))');
  expect(
    declarationsForMedia('.photo-grid', '(max-width: 767.98px)')
  ).toMatchObject({
    gap: '12px',
    'grid-template-columns': 'repeat(2, minmax(0, 1fr))',
  });
  expect(
    declarationsForMedia(
      '.photo-grid:not(.photo-grid--portraits)',
      '(max-width: 767.98px)'
    )['grid-template-columns']
  ).toBe('repeat(2, minmax(0, 1fr))');
});

test('reserves thumbnail space for loaded, missing, and failed images', () => {
  expect(declarations('.media-thumbnail')).toMatchObject({
    'aspect-ratio': '16/9',
    width: '100%',
    overflow: 'hidden',
  });
  expect(declarations('.media-thumbnail__img')).toMatchObject({
    'object-fit': 'cover',
    width: '100%',
    height: '100%',
  });
});

test('disables lightbox button transitions and hover/active scaling for reduced motion', () => {
  const query = '(prefers-reduced-motion: reduce)';
  expect(declarationsForMedia('.lightbox button', query).transition).toBe(
    'none'
  );
  [
    '.lightbox button:hover:not(:disabled)',
    '.lightbox button:active:not(:disabled)',
  ].forEach((selector) => {
    expect(declarationsForMedia(selector, query).transform).toBe('none');
  });
});
