// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

const stylesheets = [
  postcss.parse(
    compile(fileURLToPath(new URL('./details.scss', import.meta.url))).css
  ),
  postcss.parse(
    compile(
      fileURLToPath(
        new URL('../../pages/personPage/filmography.scss', import.meta.url)
      )
    ).css
  ),
];

function declarations(selector: string) {
  let result: Record<string, string> | undefined;
  stylesheets.forEach((stylesheet) => {
    let values: Record<string, string> | undefined;
    stylesheet.walkRules((rule) => {
      if (rule.parent?.type !== 'root' || !rule.selectors.includes(selector))
        return;
      values = {};
      rule.walkDecls((declaration) => {
        values![declaration.prop] = declaration.value;
      });
    });
    if (values) result = values;
  });
  if (result) return result;
  throw new Error(`Missing rule: ${selector}`);
}

function contrastRatio(foreground: string, background: string) {
  const luminance = (hex: string) => {
    const channels = hex
      .match(/[\da-f]{2}/gi)
      ?.map((channel) => parseInt(channel, 16) / 255);
    if (!channels || channels.length !== 3)
      throw new Error(`Invalid color ${hex}`);
    const [r, g, b] = channels.map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    );
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const values = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a
  );
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}

test.each([
  ['movie rating', '.movie-details__rating'],
  ['selected filmography view', '.filmography__controls [aria-pressed=true]'],
])('%s keeps readable text on the coral brand color', (_name, selector) => {
  const style = declarations(selector);
  expect(style.background).toBe('#f65261');
  expect(contrastRatio(style.color!, style.background!)).toBeGreaterThanOrEqual(
    4.5
  );
});

test('selected view keeps dark text through hover, active, and focus states', () => {
  const selector = '.filmography__controls [aria-pressed=true]';
  const base = declarations(selector);
  expect(base.color).toBe('#232323');
  [':hover', ':active', ':focus-visible'].forEach((state) => {
    const rule = stylesheets[1]!.nodes?.find(
      (node) =>
        node.type === 'rule' && node.selectors.includes(`${selector}${state}`)
    );
    if (rule?.type === 'rule') {
      let color: string | undefined;
      rule.walkDecls('color', (declaration) => {
        color = declaration.value;
      });
      expect(color ?? base.color).toBe('#232323');
    }
  });
});
