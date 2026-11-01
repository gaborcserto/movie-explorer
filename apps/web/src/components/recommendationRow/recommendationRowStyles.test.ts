// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

const stylesheet = postcss.parse(
  compile(fileURLToPath(new URL('./recommendationRow.scss', import.meta.url)))
    .css
);

function declarationsFor(selector: string) {
  const declarations: Record<string, string> = {};

  stylesheet.walkRules((rule) => {
    if (rule.selectors.includes(selector) && rule.parent?.type === 'root') {
      rule.walkDecls((declaration) => {
        declarations[declaration.prop] = declaration.value;
      });
    }
  });

  return declarations;
}

test('reserves hover and focus space without shrinking the card track or adding section spacing', () => {
  const viewport = declarationsFor('.recommendation-row__viewport');

  expect(viewport).toMatchObject({
    'overflow-x': 'auto',
    'overscroll-behavior-inline': 'contain',
    'scroll-snap-type': 'x mandatory',
    'scroll-padding-inline': 'var(--recommendation-inset)',
    padding: '32px var(--recommendation-inset) 48px',
    margin: '-32px calc(-1 * var(--recommendation-inset)) -48px',
  });
  expect(viewport['overflow-y']).toBeUndefined();
  expect(viewport['--recommendation-inset']).toBe(
    'calc(var(--recommendation-gap) / 2)'
  );
  expect(declarationsFor('.recommendation-row')['--recommendation-gap']).toBe(
    '32px'
  );
  expect(declarationsFor('.recommendation-row .list__items')).toMatchObject({
    display: 'flex',
    'flex-flow': 'row nowrap',
    width: '100%',
  });
  expect(declarationsFor('.recommendation-row .list__items > *')).toMatchObject(
    {
      flex: '0 0 calc((100% - 4 * var(--recommendation-gap)) / 5)',
      'scroll-snap-align': 'start',
    }
  );
});

test('retains a trailing inset after the last overflowing flex card without an extra card gap', () => {
  expect(
    declarationsFor('.recommendation-row .list__items:after')
  ).toMatchObject({
    content: '""',
    flex: '0 0 var(--recommendation-inset)',
    'margin-left': 'calc(-1 * var(--recommendation-gap))',
  });
});

test('keeps narrow scrollports within existing page gutters', () => {
  const insets: Array<{ media: string; value: string }> = [];

  stylesheet.walkRules('.recommendation-row__viewport', (rule) => {
    const { parent } = rule;

    if (parent?.type === 'atrule' && parent.name === 'media') {
      rule.walkDecls('--recommendation-inset', (declaration) => {
        insets.push({ media: parent.params, value: declaration.value });
      });
    }
  });

  expect(insets).toEqual([{ media: '(width <= 1023.98px)', value: '16px' }]);
});

test.each(['.list__summary', '.details-section__heading'])(
  'keeps %s controls above the compensated scrollport',
  (selector) => {
    expect(declarationsFor(`.recommendation-row ${selector}`)).toMatchObject({
      position: 'relative',
      'z-index': '4',
    });
  }
);
