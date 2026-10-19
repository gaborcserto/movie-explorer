// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

const stylesheet = postcss.parse(
  compile(fileURLToPath(new URL('./App.scss', import.meta.url))).css
);

function declarations(selector: string) {
  const values: Record<string, string> = {};
  stylesheet.walkRules((rule) => {
    if (rule.parent?.type !== 'root' || !rule.selectors.includes(selector)) {
      return;
    }

    rule.walkDecls((declaration) => {
      values[declaration.prop] = declaration.value;
    });
  });
  return values;
}

test('uses the shared coral outline action sizing, shape, and typography', () => {
  expect(declarations('.btn--action')).toMatchObject({
    background: 'rgba(246, 82, 97, 0.08)',
    'border-color': 'rgba(246, 82, 97, 0.62)',
    'border-radius': '4px',
    color: '#f65261',
    'font-size': '14px',
    'min-height': '40px',
    'min-width': '108px',
    padding: '9px 14px',
    'text-transform': 'none',
  });
  expect(declarations('.btn--action:hover')).toMatchObject({
    background: 'rgba(246, 82, 97, 0.14)',
    'border-color': '#f65261',
    color: '#f65261',
  });
  expect(declarations('.btn--action:focus-visible')).toMatchObject({
    outline: '2px solid #f65261',
    'outline-offset': '3px',
  });
});
