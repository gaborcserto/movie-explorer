// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

import {
  declarationsForMedia,
  declarationsForSelector,
} from '../../testUtils/stylesheetDeclarations';

const stylesheet = postcss.parse(
  compile(fileURLToPath(new URL('./discover.scss', import.meta.url))).css
);
const listStylesheet = postcss.parse(
  compile(
    fileURLToPath(new URL('../../components/list/list.scss', import.meta.url))
  ).css
);
const mediaStylesheet = postcss.parse(
  compile(
    fileURLToPath(
      new URL('../../components/details/media/media.scss', import.meta.url)
    )
  ).css
);
const cardStylesheet = postcss.parse(
  compile(
    fileURLToPath(new URL('../../components/card/card.scss', import.meta.url))
  ).css
);
const searchStylesheet = postcss.parse(
  compile(
    fileURLToPath(
      new URL('../../components/search/search.scss', import.meta.url)
    )
  ).css
);

test('keeps the featured carousel bounded with contained images and clamped text', () => {
  const visualStyles = declarationsForSelector(
    stylesheet,
    '.discover-featured__visual'
  );

  expect(
    declarationsForSelector(stylesheet, '.discover-featured')
  ).toMatchObject({
    background: '#171719',
    height: 'clamp(320px, 31vw, 400px)',
    overflow: 'hidden',
  });
  expect(
    declarationsForSelector(stylesheet, '.discover-featured__image')
  ).toMatchObject({
    height: '100%',
    inset: '0',
    'object-fit': 'contain',
    'object-position': 'right center',
    position: 'absolute',
    width: '100%',
  });
  expect(
    declarationsForSelector(stylesheet, '.discover-featured__image').transition
  ).toBe('opacity 700ms cubic-bezier(0.22, 1, 0.36, 1)');
  expect(
    declarationsForSelector(stylesheet, '.discover-featured__content').animation
  ).toBe('discover-content-in 400ms cubic-bezier(0.22, 1, 0.36, 1) both');
  const contentEntrance = stylesheet.nodes?.find(
    (node) => node.type === 'atrule' && node.params === 'discover-content-in'
  );
  expect(contentEntrance?.toString()).toContain('translateY(10px)');
  expect(contentEntrance?.toString()).toContain('translateY(0)');
  expect(
    declarationsForSelector(stylesheet, '.discover-featured__visual')
  ).toMatchObject({
    'aspect-ratio': '16/9',
    height: '100%',
    overflow: 'hidden',
    position: 'absolute',
    right: '0',
    top: '0',
    'z-index': '0',
    width: 'auto',
  });
  expect(visualStyles).toMatchObject({
    '-webkit-mask-image': 'var(--image-fade)',
    'mask-image': 'var(--image-fade)',
  });
  expect(visualStyles['--image-fade'].replace(/\s+/g, ' ').trim()).toBe(
    'linear-gradient( to right, transparent 0%, rgb(0 0 0 / 0.03) 8%, rgb(0 0 0 / 0.1) 16%, rgb(0 0 0 / 0.22) 25%, rgb(0 0 0 / 0.4) 35%, rgb(0 0 0 / 0.6) 45%, rgb(0 0 0 / 0.78) 55%, rgb(0 0 0 / 0.92) 65%, #000000 75% )'
  );
  expect(
    declarationsForMedia(
      stylesheet,
      '.discover-featured__visual',
      '(width <= 767.98px)'
    ).width
  ).toBeUndefined();
  expect(
    declarationsForSelector(stylesheet, '.discover-featured__image')
  ).toMatchObject({ 'z-index': '0' });
  expect(
    declarationsForSelector(stylesheet, '.discover-featured h2')
  ).toMatchObject({ '-webkit-line-clamp': '2', overflow: 'hidden' });
  expect(
    declarationsForSelector(stylesheet, '.discover-featured__overview')
  ).toMatchObject({ '-webkit-line-clamp': '2', overflow: 'hidden' });
});

test('uses a stable mobile carousel height at the narrow and mobile breakpoints', () => {
  expect(
    declarationsForMedia(
      stylesheet,
      '.discover-featured',
      '(width <= 767.98px)'
    ).height
  ).toBe('340px');
  expect(
    declarationsForMedia(stylesheet, '.discover-featured', '(width <= 399px)')
      .height
  ).toBe('360px');
});

test('scales Featured text at tablet widths and keeps its mobile CTA in view', () => {
  expect(
    declarationsForMedia(
      stylesheet,
      '.discover-featured h2',
      '(width >= 768px) and (width <= 1023.98px)'
    )
  ).toMatchObject({
    'font-size': 'clamp(32px, 4vw, 40px)',
    'max-width': '480px',
  });
  expect(
    declarationsForMedia(
      stylesheet,
      '.discover-featured__overview',
      '(width >= 768px) and (width <= 1023.98px)'
    )
  ).toMatchObject({ 'font-size': '15px', 'max-width': '440px' });
  expect(
    declarationsForMedia(
      stylesheet,
      '.discover-featured__content',
      '(width <= 767.98px)'
    )
  ).toMatchObject({ 'padding-bottom': '88px', 'padding-inline': '20px' });
});

test('uses five desktop columns and scroll-snapping rails on tablet and mobile', () => {
  expect(
    declarationsForMedia(
      stylesheet,
      '.discover-row .list__items',
      '(width >= 1024px)'
    )['grid-template-columns']
  ).toBe('repeat(5, minmax(0, 1fr))');

  expect(
    declarationsForMedia(
      stylesheet,
      '.discover-row__viewport',
      '(width <= 1023.98px)'
    )
  ).toMatchObject({
    'overflow-x': 'auto',
    'overscroll-behavior-inline': 'contain',
    'scroll-padding-inline': '0',
    'scroll-snap-type': 'x mandatory',
    'scrollbar-width': 'none',
  });
  expect(
    declarationsForMedia(
      stylesheet,
      '.discover-row .list__items',
      '(width <= 1023.98px)'
    )
  ).toMatchObject({
    display: 'flex',
    'flex-flow': 'row nowrap',
    width: '100%',
    '--discover-card-gap': '20px',
    'column-gap': 'var(--discover-card-gap)',
  });
  expect(
    declarationsForMedia(
      stylesheet,
      '.discover-row .list__items > *',
      '(width <= 1023.98px)'
    ).flex
  ).toBe('0 0 calc((100% - var(--discover-card-gap)) / 2)');
  expect(
    declarationsForMedia(
      stylesheet,
      '.discover-row .list__items > *',
      '(width <= 767.98px)'
    )['flex-basis']
  ).toBe('100%');
  expect(
    declarationsForMedia(
      stylesheet,
      '.discover-row__viewport',
      '(width >= 768px) and (width <= 1199.98px)'
    )['min-height']
  ).toBe('600px');
  expect(
    declarationsForMedia(
      stylesheet,
      '.discover-row .list__items',
      '(width <= 767.98px)'
    )
  ).toMatchObject({
    '--discover-card-gap': '16px',
    'column-gap': 'var(--discover-card-gap)',
  });
  expect(
    declarationsForMedia(
      stylesheet,
      '.discover-row__card .card',
      '(width <= 1023.98px)'
    )['max-width']
  ).toBe('none');
  expect(
    declarationsForMedia(
      stylesheet,
      '.discover-row__viewport::-webkit-scrollbar',
      '(width <= 1023.98px)'
    ).display
  ).toBe('none');
  expect(
    declarationsForSelector(stylesheet, '.discover-category__tabs')
  ).toMatchObject({
    'min-width': '0',
    'scrollbar-width': 'none',
    'overflow-x': 'auto',
  });
  expect(
    declarationsForMedia(
      stylesheet,
      '.discover-category__tabs',
      '(width <= 1023.98px)'
    )
  ).toMatchObject({
    'min-width': '0',
    'scroll-padding-inline': '8px',
    width: '100%',
  });
  expect(
    declarationsForSelector(stylesheet, '.discover-category__tabs button')
  ).toMatchObject({
    flex: '0 0 auto',
    'white-space': 'nowrap',
  });
  expect(
    declarationsForMedia(
      stylesheet,
      '.discover-row .list__items',
      '(width >= 1024px)'
    )['grid-template-columns']
  ).toBe('repeat(5, minmax(0, 1fr))');
  expect(
    declarationsForMedia(
      stylesheet,
      '.discover-row__card',
      '(width <= 1023.98px)'
    )['scroll-snap-align']
  ).toBe('start');
  expect(
    declarationsForSelector(stylesheet, '.discover-page')['overflow-x']
  ).toBe('clip');
});

test('reuses the Movies responsive results grid for discovery posters', () => {
  expect(declarationsForSelector(listStylesheet, '.list__items')).toMatchObject(
    {
      display: 'grid',
      'grid-template-columns':
        'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
      'grid-gap': '36px 32px',
    }
  );
  expect(
    declarationsForMedia(
      listStylesheet,
      '.list__items',
      '(max-width: 991.98px)'
    )['grid-gap']
  ).toBe('24px 20px');
});

test('matches the navigation divider gutters without adding another width constraint', () => {
  expect(declarationsForSelector(stylesheet, '.discover-page')).toMatchObject({
    'padding-inline': '60px',
    'padding-bottom': '72px',
  });
  expect(
    declarationsForMedia(stylesheet, '.discover-page', '(max-width: 991.98px)')[
      'padding-inline'
    ]
  ).toBe('16px');
  expect(
    declarationsForSelector(stylesheet, '.discover-page')
  ).not.toHaveProperty('width');
  expect(
    declarationsForSelector(stylesheet, '.discover-page')
  ).not.toHaveProperty('max-width');
  expect(
    declarationsForSelector(stylesheet, '.discover-row .list__items')
  ).toMatchObject({ 'min-width': '0', width: '100%' });
});

test('reserves a stable poster row across feed states and responsive layouts', () => {
  expect(
    declarationsForSelector(stylesheet, '.discover-row__viewport')['min-height']
  ).toBe('clamp(500px, 30vw + 115px, 600px)');
  expect(
    declarationsForMedia(
      stylesheet,
      '.discover-row__viewport',
      '(width >= 768px) and (width <= 1199.98px)'
    )['min-height']
  ).toBe('600px');
  expect(
    declarationsForMedia(
      stylesheet,
      '.discover-row__viewport',
      '(width <= 767.98px)'
    )['min-height']
  ).toBe('clamp(500px, 150vw + 54px, 600px)');
  expect(
    declarationsForSelector(stylesheet, '.discover-row .list__items')[
      'grid-template-columns'
    ]
  ).toBe('repeat(auto-fill, minmax(min(100%, 230px), 1fr))');
  expect(
    declarationsForSelector(stylesheet, '.discover-row__card .card')
  ).toMatchObject({ 'min-width': '0', width: '100%' });
  expect(
    declarationsForSelector(
      stylesheet,
      '.discover-row__card .card__metadata-row'
    )['flex-wrap']
  ).toBe('wrap');
});

test('uses the shared card radius without changing Featured or search radii', () => {
  expect(
    declarationsForSelector(stylesheet, '.discover-featured')['border-radius']
  ).toBe('1.25rem');
  expect(
    declarationsForSelector(cardStylesheet, '.card__image__wrapper')[
      'border-radius'
    ]
  ).toBe('10px');
  expect(
    declarationsForSelector(cardStylesheet, '.card__image__wrapper').overflow
  ).toBe('hidden');
  expect(
    declarationsForSelector(searchStylesheet, '.header__search__input')[
      'border-radius'
    ]
  ).toBe('0.625rem');
  expect(
    declarationsForSelector(searchStylesheet, '.header__search .btn')[
      'border-radius'
    ]
  ).toBe('0.625rem');
});

test('keeps Featured controls above the CTA and shares lightbox control styling', () => {
  expect(
    declarationsForSelector(stylesheet, '.discover-featured')
  ).toMatchObject({ 'border-radius': '1.25rem', overflow: 'hidden' });
  expect(
    declarationsForSelector(stylesheet, '.discover-featured__content')[
      'z-index'
    ]
  ).toBe('2');
  expect(
    declarationsForSelector(stylesheet, '.discover-featured__navigation')[
      'z-index'
    ]
  ).toBe('3');
  expect(
    declarationsForSelector(stylesheet, '.discover-featured__navigation')
  ).toMatchObject({
    left: '50%',
    right: 'auto',
    transform: 'translateX(-50%)',
  });
  expect(
    declarationsForSelector(mediaStylesheet, '.lightbox-control')
  ).toMatchObject({
    background: 'rgba(20, 20, 22, 0.68)',
    'border-radius': '50%',
    color: '#f65261',
    height: '44px',
    width: '44px',
  });
  expect(
    declarationsForMedia(
      stylesheet,
      '.discover-featured__image',
      '(prefers-reduced-motion: reduce)'
    )
  ).toMatchObject({ animation: 'none', transition: 'none' });
  expect(
    declarationsForMedia(
      stylesheet,
      '.discover-featured__content',
      '(prefers-reduced-motion: reduce)'
    )
  ).toMatchObject({ animation: 'none', transition: 'none' });
  expect(
    declarationsForMedia(
      stylesheet,
      '.discover-category__tabs button:after',
      '(prefers-reduced-motion: reduce)'
    ).transition
  ).toBe('none');
  expect(
    declarationsForMedia(
      stylesheet,
      '.discover-featured__navigation > .lightbox-control',
      '(prefers-reduced-motion: reduce)'
    ).transition
  ).toBe('none');
});
