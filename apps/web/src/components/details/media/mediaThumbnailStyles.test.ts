// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

import {
  declarationsForMedia as findDeclarationsForMedia,
  declarationsForSelector,
} from '../../../testUtils/stylesheetDeclarations';

const stylesheet = postcss.parse(
  compile(fileURLToPath(new URL('./media.scss', import.meta.url))).css
);

const declarations = (selector: string) =>
  declarationsForSelector(stylesheet, selector);
const declarationsForMedia = (selector: string, query: string) =>
  findDeclarationsForMedia(stylesheet, selector, query);

test('styles shared detail tabs for horizontal access, focus and reduced motion', () => {
  expect(declarations('.details-tabs')).toMatchObject({
    'overflow-x': 'auto',
    'overscroll-behavior-x': 'contain',
    'scrollbar-width': 'none',
    'scroll-behavior': 'smooth',
  });
  expect(declarations('.details-tabs button')).toMatchObject({
    flex: '0 0 auto',
    'white-space': 'nowrap',
  });
  expect(
    declarations('.details-tabs button[aria-selected=true]:after').transform
  ).toBe('scaleX(1)');
  expect(declarations('.details-tabs button:focus-visible').outline).toBe(
    '2px solid #f65261'
  );
  expect(declarations('.media-section > .details-tabs')['border-bottom']).toBe(
    '1px solid rgba(255, 255, 255, 0.16)'
  );
  expect(
    declarations('.details-tabs button:after')['background-color'] ??
      declarations('.details-tabs button:after').background
  ).toBe('#f65261');
  expect(declarations('.details-tabs button:after').bottom).toBe('-1px');
  expect(declarations('.details-tabs__panel:not([hidden])').animation).toBe(
    'details-tab-panel-in 180ms ease both'
  );
  expect(
    declarationsForMedia('.details-tabs', '(prefers-reduced-motion: reduce)')[
      'scroll-behavior'
    ]
  ).toBe('auto');
  expect(
    declarationsForMedia(
      '.details-tabs__panel:not([hidden])',
      '(prefers-reduced-motion: reduce)'
    ).animation
  ).toBe('none');
});

test.each(['.photo-tile', '.video-tile'])(
  'matches Movie Card outer-card hover behavior for %s',
  (tileSelector) => {
    const imageSelector = `${tileSelector} img`;
    expect(declarations(tileSelector)).toMatchObject({
      'transform-origin': 'center top',
      transition: 'transform 0.24s ease, filter 0.24s ease',
    });
    expect(declarations(tileSelector)).toMatchObject({
      'border-radius': '10px',
      overflow: 'hidden',
    });
    expect(declarations(imageSelector).transform).toBeUndefined();
    expect(
      declarationsForMedia(
        `${tileSelector}:hover`,
        '(hover: hover) and (pointer: fine)'
      )
    ).toMatchObject({
      filter: 'saturate(1.2)',
      transform: 'scale(1.06)',
      'z-index': '3',
    });
    expect(declarations(`${tileSelector}:focus-visible`)).toMatchObject({
      outline: '2px solid #f65261',
      'outline-offset': '3px',
      'z-index': '2',
    });
  }
);

test('preserves thumbnail aspect ratios and disables scaling for reduced motion', () => {
  expect(declarations('.photo-tile')['aspect-ratio']).toBe('16/9');
  expect(declarations('.video-tile img')['aspect-ratio']).toBe('16/9');
  expect(declarations('.video-tile img').height).toBe('auto');

  ['.photo-tile', '.video-tile'].forEach((selector) => {
    expect(
      declarationsForMedia(selector, '(prefers-reduced-motion: reduce)')
        .transition
    ).toBe('none');
  });
  ['.photo-tile:hover', '.video-tile:hover'].forEach((selector) => {
    expect(
      declarationsForMedia(selector, '(prefers-reduced-motion: reduce)')
        .transform
    ).toBe('none');
  });
});

test('uses six backdrop, ten portrait and four video columns on desktop', () => {
  expect(declarations('.photo-grid:not(.photo-grid--portraits)')).toMatchObject(
    {
      'grid-template-columns': 'repeat(6, minmax(0, 1fr))',
    }
  );
  expect(declarations('.photo-grid--portraits')).toMatchObject({
    'grid-template-columns': 'repeat(10, minmax(0, 1fr))',
  });
  expect(declarations('.video-grid')).toMatchObject({
    'grid-template-columns': 'repeat(4, minmax(0, 1fr))',
  });
  expect(declarations('.photo-grid')).toMatchObject({ gap: '12px' });
});

test('reduces media columns at tablet and mobile widths', () => {
  expect(
    declarationsForMedia(
      '.photo-grid:not(.photo-grid--portraits)',
      '(max-width: 991.98px)'
    )['grid-template-columns']
  ).toBe('repeat(3, minmax(0, 1fr))');
  expect(
    declarationsForMedia('.photo-grid--portraits', '(max-width: 991.98px)')[
      'grid-template-columns'
    ]
  ).toBe('repeat(5, minmax(0, 1fr))');
  expect(
    declarationsForMedia('.video-grid', '(max-width: 991.98px)')[
      'grid-template-columns'
    ]
  ).toBe('repeat(2, minmax(0, 1fr))');
  expect(
    declarationsForMedia('.photo-grid', '(max-width: 767.98px)')
  ).toMatchObject({
    gap: '12px',
    'grid-template-columns': 'repeat(2, minmax(0, 1fr))',
  });
  expect(
    declarationsForMedia(
      '.photo-grid:not(.photo-grid--portraits)',
      '(max-width: 767.98px)'
    )['grid-template-columns']
  ).toBe('repeat(2, minmax(0, 1fr))');
});

test('reserves thumbnail space for loaded, missing, and failed images', () => {
  expect(declarations('.media-thumbnail')).toMatchObject({
    'aspect-ratio': '16/9',
    'border-radius': '10px',
    width: '100%',
    overflow: 'hidden',
  });
  expect(declarations('.media-thumbnail__img')).toMatchObject({
    'border-radius': '10px',
    'object-fit': 'cover',
    width: '100%',
    height: '100%',
  });
  expect(
    declarations(
      '.photo-grid:not(.photo-grid--portraits) .media-thumbnail__img'
    )['object-fit']
  ).toBe('contain');
  expect(
    declarations('.photo-grid--posters .media-thumbnail__img')['object-fit']
  ).toBe('contain');
});

test('disables lightbox button transitions and hover/active scaling for reduced motion', () => {
  const query = '(prefers-reduced-motion: reduce)';
  expect(declarationsForMedia('.lightbox button', query).transition).toBe(
    'none'
  );
  [
    '.lightbox button:hover:not(:disabled)',
    '.lightbox button:active:not(:disabled)',
  ].forEach((selector) => {
    expect(declarationsForMedia(selector, query).transform).toBe('none');
  });
});

test('shares the photo overlay and control geometry with video playback', () => {
  expect(declarations('.lightbox')).toMatchObject({
    background: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    inset: '0',
    position: 'fixed',
    'z-index': '1000',
  });
  expect(declarations('.lightbox__toolbar')).toMatchObject({
    'justify-content': 'flex-end',
    'padding-bottom': '12px',
  });
  expect(declarations('.lightbox__toolbar span')['margin-right']).toBe('auto');
  expect(declarations('.lightbox__nav--previous').left).toBe('16px');
  expect(declarations('.lightbox__nav--next').right).toBe('16px');
  expect(declarations('.video-lightbox__player iframe')).toMatchObject({
    'aspect-ratio': '16/9',
    'max-height': '100%',
    width: 'min(100%, (100dvh - 220px) * 1.7778, 1280px)',
  });
});
