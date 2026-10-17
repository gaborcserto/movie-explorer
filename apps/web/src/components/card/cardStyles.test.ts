// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

test('static filmography genres let clicks reach the movie link while Search genres stay interactive', () => {
  const stylesheet = postcss.parse(
    compile(fileURLToPath(new URL('./card.scss', import.meta.url))).css
  );
  const pointerEvents: Record<string, string> = {};
  stylesheet.walkRules((rule) => {
    rule.walkDecls('pointer-events', (declaration) => {
      pointerEvents[rule.selector] = declaration.value;
    });
  });
  expect(pointerEvents['.card__type--static']).toBe('none');
  expect(pointerEvents['.card__type']).toBeUndefined();
  expect(pointerEvents['.card__type__link']).toBeUndefined();
});
