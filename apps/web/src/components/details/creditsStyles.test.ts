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
  expect(declarations('.cast-member__link h3')).toMatchObject({
    'text-decoration-color': 'transparent',
    transition: 'color 180ms ease, text-decoration-color 180ms ease',
  });
});

test.each(['hover', 'focus-visible'])(
  'shows coral text and underline for both credit links on %s',
  (state) => {
    [
      `.movie-details__credits .person-credit-link:${state}`,
      `.cast-member__link:${state} h3`,
    ].forEach((selector) => {
      expect(declarations(selector)).toMatchObject({
        color: '#f65261',
        'text-decoration-color': 'currentcolor',
      });
    });
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
});
