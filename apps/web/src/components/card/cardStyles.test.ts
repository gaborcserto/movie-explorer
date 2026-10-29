// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

const stylesheet = postcss.parse(
  compile(fileURLToPath(new URL('./card.scss', import.meta.url))).css
);

test('static filmography genres let clicks reach the movie link while Search genres stay interactive', () => {
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

test('clips poster cards with consistent 10px corners', () => {
  const declarations = new Map<string, string>();
  stylesheet.walkRules((rule) => {
    if (
      rule.selectors.includes('.card__image__wrapper') ||
      rule.selectors.includes('.card__image__img')
    ) {
      rule.walkDecls('border-radius', (declaration) => {
        declarations.set(rule.selector, declaration.value);
      });
    }
  });

  expect(declarations.get('.card__image__wrapper')).toBe('10px');
  expect(declarations.get('.card__image__img')).toBe('10px');
});

test('styles release years as compact coral badges', () => {
  const declarations: Record<string, string> = {};

  stylesheet.walkRules('.card__date', (rule) => {
    rule.walkDecls((declaration) => {
      declarations[declaration.prop] = declaration.value;
    });
  });

  expect(declarations).toMatchObject({
    background: '#f65261',
    border: '0',
    'border-radius': '4px',
    color: '#ffffff',
    'font-weight': '700',
    padding: '4px 8px',
  });
});

test('renders shared movie and series card titles in bold', () => {
  let fontWeight: string | undefined;

  stylesheet.walkRules('.card__title', (rule) => {
    rule.walkDecls('font-weight', (declaration) => {
      fontWeight = declaration.value;
    });
  });

  expect(fontWeight).toBe('700');
});
