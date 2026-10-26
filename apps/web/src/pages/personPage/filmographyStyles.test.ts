// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

const stylesheet = postcss.parse(
  compile(fileURLToPath(new URL('./filmography.scss', import.meta.url))).css
);

function declarations(selector: string, within?: postcss.AtRule) {
  const values: Record<string, string> = {};
  const root = within ?? stylesheet;
  root.walkRules((rule) => {
    if (rule.parent !== root) {
      return;
    }
    if (!rule.selectors.includes(selector)) {
      return;
    }
    rule.nodes?.forEach((node) => {
      if (node.type === 'decl') {
        values[node.prop] = node.value;
      }
    });
  });

  return values;
}

test('preserves active category underlines and visible keyboard focus', () => {
  expect(
    declarations('.filmography__media-tabs button[aria-pressed=true]')
  ).toMatchObject({ color: '#ffffff' });
  expect(
    declarations('.filmography__media-tabs button[aria-pressed=true]:after')
  ).toMatchObject({ transform: 'scaleX(1)' });
  expect(
    declarations('.filmography__media-tabs button:focus-visible')
  ).toMatchObject({
    outline: '2px solid #f65261',
    'outline-offset': '3px',
  });
});

test('keeps media labels inline with wrapping titles and the poster in the left column on mobile', () => {
  expect(declarations('.filmography__heading')).toMatchObject({
    'grid-column': '2',
    'grid-row': '1',
    'min-width': '0',
    'overflow-wrap': 'anywhere',
  });
  expect(declarations('.filmography__media-type')).toMatchObject({
    'font-size': '12px',
    opacity: '0.5',
    'margin-left': '8px',
    'white-space': 'nowrap',
  });
  expect(declarations('.filmography__metadata')).toMatchObject({
    display: 'contents',
  });
  expect(declarations('.filmography__poster')).toMatchObject({
    'grid-column': '1',
    'grid-row': '1/-1',
  });

  const mobile = stylesheet.nodes
    .filter(
      (node): node is postcss.AtRule =>
        node.type === 'atrule' &&
        node.name === 'media' &&
        node.params === '(width <= 480px)'
    )
    .find(
      (rule) => declarations('.filmography__row', rule)['grid-template-columns']
    );

  expect(mobile).toBeDefined();
  expect(declarations('.filmography__row', mobile)).toMatchObject({
    'grid-template-columns': '48px minmax(0, 1fr)',
    'grid-template-rows': 'auto auto auto',
  });
  expect(declarations('.filmography__year', mobile)).toMatchObject({
    'grid-column': '2',
    'grid-row': '2',
  });
  expect(declarations('.filmography__role', mobile)).toMatchObject({
    'grid-row': '3',
  });
});

test('matches Movie Card hover scale, transition, elevation, and focus stacking', () => {
  const hover = stylesheet.nodes.find(
    (node): node is postcss.AtRule =>
      node.type === 'atrule' &&
      node.name === 'media' &&
      node.params === '(hover: hover) and (pointer: fine)'
  );
  expect(hover).toBeDefined();
  expect(
    declarations('.filmography a.filmography__row:hover', hover)
  ).toMatchObject({
    transform: 'scale(1.06)',
    filter: 'saturate(1.2)',
    'z-index': '3',
    'box-shadow': '0 16px 30px rgba(0, 0, 0, 0.32)',
  });
  expect(declarations('.filmography__row')).toMatchObject({
    position: 'relative',
    'transform-origin': 'center top',
    transition:
      'transform 0.24s ease, filter 0.24s ease, box-shadow 0.24s ease',
  });
  expect(declarations('.filmography__row:focus-within')).toMatchObject({
    'z-index': '2',
  });
  expect(declarations('.filmography__row:focus-visible')).toMatchObject({
    outline: '2px solid #f65261',
    'outline-offset': '4px',
  });
});

test('removes the row hover scale and transitions for reduced motion', () => {
  const reducedMotion = stylesheet.nodes.find(
    (node): node is postcss.AtRule =>
      node.type === 'atrule' &&
      node.name === 'media' &&
      node.params === '(prefers-reduced-motion: reduce)'
  );
  expect(reducedMotion).toBeDefined();
  expect(reducedMotion?.nodes).toContainEqual(
    expect.objectContaining({
      type: 'rule',
      selectors: expect.arrayContaining([
        '.filmography__row',
        '.filmography__poster',
        '.filmography__title',
      ]),
      nodes: expect.arrayContaining([
        expect.objectContaining({ prop: 'transition', value: 'none' }),
      ]),
    })
  );
  const reducedHover = stylesheet.nodes.find(
    (node): node is postcss.AtRule =>
      node.type === 'atrule' &&
      node.name === 'media' &&
      node.params.includes('(prefers-reduced-motion: reduce)') &&
      node.params.includes('(hover: hover)')
  );
  expect(
    declarations('.filmography a.filmography__row:hover', reducedHover)
  ).toMatchObject({ transform: 'none' });
});

test('keeps filmography titles white and unadorned while styling metadata as secondary text', () => {
  expect(declarations('.filmography__title')).toMatchObject({
    color: '#ffffff',
    opacity: '1',
    'text-decoration': 'none',
  });
  const secondaryText = {
    color: '#ffffff',
    'font-size': '14px',
    'line-height': '17px',
    opacity: '0.5',
    'text-decoration': 'none',
    transition: 'color 0.2s ease, opacity 0.2s ease',
  };
  expect(declarations('.filmography__year')).toMatchObject(secondaryText);
  expect(declarations('.filmography__role')).toMatchObject(secondaryText);
  ['link', 'visited', 'hover', 'active', 'focus-visible'].forEach((state) => {
    expect(
      declarations(`.filmography a.filmography__row:${state}`)
    ).toMatchObject({ 'text-decoration': 'none' });
  });
  expect(
    declarations('.filmography a.filmography__row:hover .filmography__role')
      .opacity
  ).toBe('0.75');
});
