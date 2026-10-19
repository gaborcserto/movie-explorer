// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

test('disables opening and closing transitions when reduced motion is requested', () => {
  const stylesheet = postcss.parse(
    compile(fileURLToPath(new URL('./headerSearch.scss', import.meta.url))).css
  );
  const transitions: string[] = [];

  stylesheet.walkAtRules('media', (media) => {
    if (media.params !== '(prefers-reduced-motion: reduce)') return;
    media.walkRules('.detail-search__form', (rule) => {
      rule.walkDecls('transition', (declaration) => {
        transitions.push(declaration.value);
      });
    });
  });
  expect(transitions).toEqual(['none']);
});

test('keeps the magnifier anchored while the shared field and its content animate', () => {
  const stylesheet = postcss.parse(
    compile(fileURLToPath(new URL('./headerSearch.scss', import.meta.url))).css
  );
  const transitions: string[] = [];

  stylesheet.walkRules((rule) => {
    if (
      !rule.selectors.some((selector) =>
        selector.includes('.detail-search__form')
      )
    )
      return;
    rule.walkDecls('transition', (declaration) => {
      transitions.push(declaration.value);
    });
  });
  expect(transitions).toContain(
    'width 280ms cubic-bezier(0.22, 1, 0.36, 1), background-color 260ms ease, border-color 260ms ease, visibility 0s linear 280ms'
  );
  expect(transitions).toContain(
    'width 280ms cubic-bezier(0.22, 1, 0.36, 1), background-color 260ms ease, border-color 260ms ease, visibility 0s'
  );
  expect(transitions).toContain('opacity 90ms ease, outline-color 0s');
  expect(transitions).toContain(
    'opacity 150ms ease 75ms, outline-color 0s 140ms'
  );
});

test('morphs both icons in the anchored toggle and disables that motion for reduced motion', () => {
  const stylesheet = postcss.parse(
    compile(fileURLToPath(new URL('./headerSearch.scss', import.meta.url))).css
  );
  const iconTransitions: string[] = [];

  stylesheet.walkRules('.detail-search__trigger svg', (rule) => {
    rule.walkDecls('transition', (declaration) => {
      iconTransitions.push(declaration.value);
    });
  });
  expect(iconTransitions).toContain(
    'opacity 180ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1)'
  );
  let reducedMotionDisablesIcon = false;
  stylesheet.walkAtRules('media', (media) => {
    if (media.params !== '(prefers-reduced-motion: reduce)') return;
    media.walkRules('.detail-search__trigger svg', (rule) => {
      rule.walkDecls('transition', (declaration) => {
        reducedMotionDisablesIcon ||= declaration.value === 'none';
      });
    });
  });
  expect(reducedMotionDisablesIcon).toBe(true);
});

test('lets the expanded input opacity override its collapsed state', () => {
  const stylesheet = postcss.parse(
    compile(fileURLToPath(new URL('./headerSearch.scss', import.meta.url))).css
  );
  const inputRules: { selector: string; opacity: string }[] = [];

  stylesheet.walkRules((rule) => {
    if (
      rule.selectors.some(
        (selector) =>
          selector.includes('.detail-search__form') &&
          selector.includes('input')
      )
    ) {
      const opacity = rule.nodes?.find(
        (node) => node.type === 'decl' && node.prop === 'opacity'
      );
      if (opacity?.type === 'decl')
        inputRules.push({
          selector: rule.selectors[0],
          opacity: opacity.value,
        });
    }
  });
  const collapsedIndex = inputRules.findIndex(
    ({ selector }) => selector === '.detail-search__form input'
  );
  const expandedIndex = inputRules.findIndex(
    ({ selector }) => selector === '.detail-search__form--expanded input'
  );

  expect(inputRules[collapsedIndex]?.opacity).toBe('0');
  expect(inputRules[expandedIndex]?.opacity).toBe('1');
  expect(expandedIndex).toBeGreaterThan(collapsedIndex);
});
