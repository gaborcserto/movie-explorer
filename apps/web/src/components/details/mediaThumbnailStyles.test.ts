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

test.each(['.photo-grid', '.video-grid'])(
  'adds breathing room while preserving responsive columns for %s',
  (gridSelector) => {
    expect(declarations(gridSelector)).toMatchObject({
      gap: '20px 24px',
      'grid-template-columns':
        'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
    });
    expect(
      declarationsForMedia(gridSelector, '(max-width: 767.98px)')
    ).toMatchObject({
      gap: '16px',
      'grid-template-columns': 'repeat(2, minmax(0, 1fr))',
    });
    expect(
      declarationsForMedia(gridSelector, '(width <= 359px)')
    ).toMatchObject({
      gap: '16px',
      'grid-template-columns': 'minmax(0, 1fr)',
    });
  }
);
