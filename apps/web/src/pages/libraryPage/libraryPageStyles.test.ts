// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss, { type Root } from 'postcss';

const listStyles = postcss.parse(
  compile(
    fileURLToPath(new URL('../../components/list/list.scss', import.meta.url))
  ).css
);
const libraryStyles = postcss.parse(
  compile(fileURLToPath(new URL('./libraryPage.scss', import.meta.url))).css
);
const cardStyles = postcss.parse(
  compile(
    fileURLToPath(new URL('../../components/card/card.scss', import.meta.url))
  ).css
);

function declarations(styles: Root, selector: string) {
  const values: Record<string, string> = {};

  styles.walkRules(selector, (rule) => {
    if (rule.parent?.type !== 'root') {
      return;
    }

    rule.walkDecls((declaration) => {
      values[declaration.prop] = declaration.value;
    });
  });

  return values;
}

test('keeps Search card grid tracks and centers cards through the shared grid', () => {
  expect(declarations(listStyles, '.list__items')).toMatchObject({
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
    'grid-gap': '36px 32px',
    'justify-items': 'center',
  });
  expect(declarations(cardStyles, '.card')).not.toHaveProperty('justify-self');
});

test('starts Library cards at the first grid column without changing grid tracks', () => {
  const libraryGrid = declarations(
    libraryStyles,
    '.library-page__content .list__items'
  );

  expect(libraryGrid).toEqual({ 'justify-items': 'start' });
  expect(libraryGrid['grid-template-columns']).toBeUndefined();
});
