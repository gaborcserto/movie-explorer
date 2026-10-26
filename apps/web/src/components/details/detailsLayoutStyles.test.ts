// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

const stylesheet = postcss.parse(
  compile(fileURLToPath(new URL('./details.scss', import.meta.url))).css
);
const mediaStylesheet = postcss.parse(
  compile(fileURLToPath(new URL('./media/media.scss', import.meta.url))).css
);

function declarations(selector: string, media?: string) {
  const values: Record<string, string> = {};

  stylesheet.walkRules((rule) => {
    const { parent } = rule;
    const matches = media
      ? parent?.type === 'atrule' && parent.params === media
      : parent?.type === 'root';

    if (matches && rule.selectors.includes(selector)) {
      rule.walkDecls((decl) => {
        values[decl.prop] = decl.value;
      });
    }
  });

  return values;
}

test('retains the Movie hero dimensions, grid gap and title typography for every page', () => {
  expect(declarations('.movie-details')).toMatchObject({ padding: '0 60px' });
  expect(declarations('.movie-details__image')).toMatchObject({
    width: '320px',
    flex: '0 0 320px',
    'aspect-ratio': '2/3',
  });
  expect(declarations('.movie-details__container')).toMatchObject({
    display: 'flex',
    gap: '60px',
    'padding-bottom': '30px',
  });
  expect(declarations('.movie-details__title')).toMatchObject({
    'font-size': 'clamp(30px, 4vw, 40px)',
    'font-weight': '300',
    'line-height': '1.25',
  });
});

test('aligns provider categories with Movie metadata tracks and keeps logos compact', () => {
  expect(declarations('.watch-providers__groups')).toMatchObject({
    display: 'grid',
    'grid-template-columns': expect.stringContaining('180px'),
    gap: '10px 20px',
  });
  expect(declarations('.watch-providers__group ul')).toMatchObject({
    display: 'flex',
    'flex-wrap': 'wrap',
    gap: '8px',
  });
});

test('removes the provider section border with specificity above the shared section rule', () => {
  let sharedBorder: string | undefined;

  mediaStylesheet.walkRules('.details-section', (rule) => {
    rule.walkDecls('border-top', (declaration) => {
      sharedBorder = declaration.value;
    });
  });

  expect(sharedBorder).toContain('1px solid');
  expect(declarations('.details-section.watch-providers')).toHaveProperty(
    'border-top',
    '0'
  );
});

test('shares tablet and mobile behavior while retaining the episode still aspect ratio', () => {
  expect(
    declarations('.movie-details__image', '(max-width: 991.98px)')
  ).toMatchObject({ width: '260px', 'flex-basis': '260px' });
  expect(
    declarations('.movie-details__container', '(max-width: 767.98px)')
  ).toMatchObject({ display: 'block' });
  expect(
    declarations('.movie-details__image', '(max-width: 767.98px)')
  ).toMatchObject({ width: '100%', 'max-width': '320px' });
  expect(
    declarations('.movie-details__title', '(max-width: 767.98px)')
  ).toMatchObject({ 'font-size': '24px' });
  expect(declarations('.movie-details__image--still')).toMatchObject({
    'aspect-ratio': '16/9',
  });
});

test('uses two-column department groups with a container-based narrow-width fallback', () => {
  let groupColumns: string | undefined;
  let containerColumns: string | undefined;

  mediaStylesheet.walkRules('.crew-group__people', (rule) => {
    const ruleDeclarations: Record<string, string> = {};

    rule.walkDecls('grid-template-columns', (declaration) => {
      ruleDeclarations[declaration.prop] = declaration.value;
    });

    if (rule.parent?.type === 'root') {
      groupColumns = ruleDeclarations['grid-template-columns'];
    }
    if (
      rule.parent?.type === 'atrule' &&
      rule.parent.params === '(max-width: 359px)'
    ) {
      containerColumns = ruleDeclarations['grid-template-columns'];
    }
  });

  expect(groupColumns).toBe('repeat(2, minmax(0, 1fr))');
  expect(containerColumns).toBe('minmax(0, 1fr)');
});
