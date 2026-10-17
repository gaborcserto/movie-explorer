// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

const styles = (file: string) =>
  postcss.parse(compile(fileURLToPath(new URL(file, import.meta.url))).css);

test('disables all decorative animation immediately for reduced motion', () => {
  const sheet = styles('./popcornIllustration.scss');
  const disabled: string[] = [];
  sheet.walkAtRules('media', (media) => {
    if (media.params !== '(prefers-reduced-motion: reduce)') return;
    media.walkRules((rule) => {
      rule.walkDecls('animation', (decl) => {
        expect(decl.value).toBe('none');
        disabled.push(...rule.selectors);
      });
    });
  });
  expect(disabled).toEqual([
    '.popcorn-illustration',
    '.popcorn-illustration__bucket',
    '.popcorn-illustration__kernel',
  ]);
  const animations: string[] = [];
  sheet.walkDecls('animation', (decl) => {
    animations.push(decl.value);
  });
  expect(animations.join(' ')).not.toContain('infinite');
  expect(animations).toContain('popcorn-entrance 300ms ease-out');
  const opacity: string[] = [];
  sheet.walkRules('.popcorn-illustration', (rule) => {
    rule.walkDecls('opacity', (decl) => {
      opacity.push(decl.value);
    });
  });
  expect(opacity).toEqual([]);
});

test('keeps the layout flowing, bounds its width, and stacks actions on mobile', () => {
  const sheet = styles('./errorPresentation.scss');
  const base: Record<string, string> = {};
  sheet.walkRules('.error-presentation', (rule) => {
    if (rule.parent?.type !== 'root') return;
    rule.walkDecls((decl) => {
      base[decl.prop] = decl.value;
    });
  });
  expect(base).toMatchObject({
    'box-sizing': 'border-box',
    'max-width': '640px',
    width: '100%',
    padding: '32px 20px',
  });
  expect(base.position).toBeUndefined();
  expect(base.height).toBeUndefined();
  const directions: string[] = [];
  sheet.walkRules('.error-presentation__actions', (rule) => {
    rule.walkDecls(/^flex-(direction|flow)$/, (decl) => {
      directions.push(decl.value.split(' ')[0]);
    });
  });
  expect(directions).toEqual(['column', 'row']);
  const sizes: string[] = [];
  sheet.walkRules('.error-presentation__illustration', (rule) => {
    rule.walkDecls('width', (decl) => {
      sizes.push(decl.value);
    });
  });
  expect(sizes).toEqual([
    'clamp(136px, 50vw - 24px, 272px)',
    'clamp(208px, 27vw, 272px)',
  ]);
  const targets: string[] = [];
  sheet.walkDecls('min-height', (decl) => {
    targets.push(decl.value);
  });
  expect(targets).toContain('44px');
});

test('retains the intentional white-on-coral primary action contrast exception', () => {
  // Existing product palette exception; this does not assert WCAG AA compliance.
  const sheet = styles('../../App.scss');
  const primary: Record<string, string> = {};
  sheet.walkRules('.btn--primary', (rule) => {
    rule.walkDecls((decl) => {
      primary[decl.prop] = decl.value;
    });
  });
  expect(primary).toMatchObject({
    'background-color': '#f65261',
    color: '#ffffff',
  });
  let focusOutline = '';
  sheet.walkRules('.btn:focus-visible', (rule) => {
    rule.walkDecls('outline', (decl) => {
      focusOutline = decl.value;
    });
  });
  expect(focusOutline).toBe('2px solid #ffffff');
});
