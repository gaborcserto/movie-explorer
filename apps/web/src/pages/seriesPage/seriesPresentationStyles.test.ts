// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import postcss from 'postcss';

import {
  declarationsForMedia,
  declarationsForSelector,
} from '../../testUtils/stylesheetDeclarations';

const seriesStyles = postcss.parse(
  compile(fileURLToPath(new URL('./series.scss', import.meta.url))).css
);
const mediaStyles = postcss.parse(
  compile(
    fileURLToPath(
      new URL('../../components/details/media/media.scss', import.meta.url)
    )
  ).css
);

function declarationsForFormattedSelector(
  stylesheet: postcss.Root,
  selector: string
) {
  const expected = selector.replace(/\s+/g, ' ').trim();
  const values: Record<string, string> = {};

  stylesheet.walkRules((rule) => {
    if (
      !rule.selectors.some(
        (current) => current.replace(/\s+/g, ' ').trim() === expected
      )
    ) {
      return;
    }

    rule.walkDecls((declaration) => {
      values[declaration.prop] = declaration.value;
    });
  });

  return values;
}

test('fills the Series content width with a responsive, clamped Cast grid', () => {
  expect(
    declarationsForSelector(seriesStyles, '.series-credits .cast-grid')
  ).toMatchObject({
    display: 'grid',
    width: '100%',
    margin: '0',
    'grid-template-columns': expect.stringContaining('12.5% - 8.75px'),
  });
  expect(
    declarationsForSelector(seriesStyles, '.series-credits .cast-grid')
  ).not.toHaveProperty('max-width');
  expect(
    declarationsForSelector(seriesStyles, '.series-credits .cast-grid')
  ).not.toHaveProperty('margin-inline');
  expect(
    declarationsForSelector(seriesStyles, '.series-credits .cast-member__image')
  ).toMatchObject({ 'max-width': 'none' });
  expect(
    declarationsForSelector(seriesStyles, '.series-season-poster')[
      'border-radius'
    ]
  ).toBe('10px');
  expect(
    declarationsForSelector(seriesStyles, '.series-episode-still')[
      'border-radius'
    ]
  ).toBe('10px');
  expect(
    declarationsForSelector(seriesStyles, '.series-credits .cast-member p')
  ).toMatchObject({
    '-webkit-line-clamp': '2',
    'line-clamp': '2',
    overflow: 'hidden',
  });
});

test('styles Series creator links without an underline and keeps hover and focus states', () => {
  expect(
    declarationsForSelector(
      seriesStyles,
      '.series-hero-metadata .series-people a'
    )
  ).toMatchObject({
    color: 'inherit',
    'text-decoration': 'none',
  });
  expect(
    declarationsForSelector(
      seriesStyles,
      '.series-hero-metadata .series-people a:hover'
    )
  ).toMatchObject({ color: '#f65261' });
  expect(
    declarationsForSelector(
      seriesStyles,
      '.series-hero-metadata .series-people a:focus-visible'
    )
  ).toMatchObject({ outline: '2px solid #f65261' });
});

test('leaves provider group columns to the shared WatchProviders styles', () => {
  expect(
    declarationsForSelector(
      seriesStyles,
      '.series-hero-metadata .watch-providers__groups'
    )
  ).toEqual({});
});

test('uses shared full-width Cast and Crew tabs for Movie and Series credits', () => {
  expect(
    declarationsForSelector(
      mediaStyles,
      '.series-sections .crew-group__people'
    )['grid-template-columns']
  ).toContain('auto-fill');
  expect(declarationsForSelector(mediaStyles, '.details-tabs')).toMatchObject({
    display: 'flex',
    'overflow-x': 'auto',
  });
  expect(
    declarationsForSelector(seriesStyles, '.series-credits .cast-crew-layout')
  ).toEqual({});
});

test('matches the Cast and Crew heading and separator to homepage section headers', () => {
  expect(
    declarationsForSelector(seriesStyles, '.series-credits > h2')
  ).toMatchObject({
    'font-size': 'clamp(20px, 2vw, 26px)',
    'line-height': '1.25',
  });
  expect(
    declarationsForSelector(seriesStyles, '.series-credits > .details-tabs')[
      'border-bottom'
    ]
  ).toBe('1px solid rgba(255, 255, 255, 0.16)');
});

test('hides the season scrollbar while keeping horizontal scrolling and tab focus visible', () => {
  expect(declarationsForSelector(seriesStyles, '.season-tabs')).toMatchObject({
    overflow: 'auto hidden',
    'scrollbar-width': 'none',
  });
  expect(
    declarationsForSelector(seriesStyles, '.season-tabs::-webkit-scrollbar')
  ).toMatchObject({ display: 'none' });
  expect(
    declarationsForSelector(seriesStyles, '.season-tabs-navigation')
  ).toMatchObject({ 'border-bottom': '1px solid rgba(255, 255, 255, 0.16)' });
  expect(
    declarationsForSelector(seriesStyles, '.season-tabs button:focus-visible')
  ).toMatchObject({ outline: '2px solid #f65261', 'outline-offset': '-3px' });
  expect(
    declarationsForSelector(seriesStyles, '.season-tabs button')
  ).toMatchObject({ 'min-height': '48px', padding: '8px 4px' });
  expect(
    declarationsForSelector(seriesStyles, '.season-tabs button:after')
  ).toMatchObject({ bottom: '0', height: '2px' });
});

test('matches Filmography row hover, focus, separators, and responsive episodes', () => {
  expect(
    declarationsForMedia(
      seriesStyles,
      '.series-episode-link:hover',
      '(hover: hover) and (pointer: fine)'
    )
  ).toMatchObject({
    'box-shadow': '0 16px 30px rgba(0, 0, 0, 0.32)',
    filter: 'saturate(1.2)',
    transform: 'scale(1.06)',
    'z-index': '3',
  });
  expect(
    declarationsForMedia(
      seriesStyles,
      '.series-episode-link:hover',
      '(hover: hover) and (pointer: fine)'
    )
  ).not.toHaveProperty('background');
  expect(
    declarationsForSelector(seriesStyles, '.series-episode-link:hover')
  ).not.toHaveProperty('outline');
  expect(
    declarationsForSelector(seriesStyles, '.series-episode-link:focus-visible')
  ).toMatchObject({ outline: '2px solid #f65261', 'outline-offset': '4px' });
  expect(
    declarationsForSelector(seriesStyles, '.series-episode-link:hover h3').color
  ).toBe('#f65261');
  expect(
    declarationsForSelector(
      seriesStyles,
      '.series-episode-link:focus-visible h3'
    ).color
  ).toBe('#f65261');
  expect(
    declarationsForSelector(
      seriesStyles,
      '.series-episodes > li:has(> .series-episode-link:is(:hover, :focus-visible, :focus-within))'
    )
  ).toEqual({ 'border-bottom-color': 'transparent' });
  expect(
    declarationsForFormattedSelector(
      seriesStyles,
      '.series-episodes > li:has(+ li > .series-episode-link:is(:hover, :focus-visible, :focus-within))'
    )
  ).toEqual({ 'border-bottom-color': 'transparent' });
  expect(
    declarationsForSelector(seriesStyles, '.series-episodes > li:last-child')
  ).toMatchObject({ 'border-bottom': '0' });
  expect(
    declarationsForMedia(
      seriesStyles,
      '.series-episode-content',
      '(width < 600px)'
    )
  ).toMatchObject({ 'grid-template-columns': 'minmax(0, 1fr)' });
  expect(
    declarationsForMedia(
      seriesStyles,
      '.series-episode-link',
      '(width < 600px)'
    )
  ).toMatchObject({ 'grid-template-columns': 'minmax(0, 1fr)' });
  expect(
    declarationsForMedia(
      seriesStyles,
      '.series-detail__context',
      '(width < 600px)'
    )
  ).toMatchObject({ 'flex-direction': 'column' });
  expect(
    declarationsForMedia(
      seriesStyles,
      '.series-detail__context .series-breadcrumbs',
      '(width < 600px)'
    )
  ).toMatchObject({ flex: '0 1 auto' });
  expect(
    declarationsForMedia(seriesStyles, '.series-breadcrumbs', '(width < 480px)')
  ).toMatchObject({ 'font-size': '13px' });
  expect(
    declarationsForMedia(seriesStyles, '.season-hero', '(width < 1200px)')
  ).toMatchObject({ display: 'flex', 'flex-direction': 'row' });
  expect(
    declarationsForMedia(
      seriesStyles,
      '.season-hero .movie-details__image',
      '(width < 1200px)'
    )
  ).toMatchObject({ width: '220px', 'max-width': '220px' });
  expect(
    declarationsForMedia(
      seriesStyles,
      '.season-hero .movie-details__image',
      '(width < 768px)'
    )
  ).toMatchObject({ width: '180px', 'max-width': '180px' });
  expect(
    declarationsForMedia(seriesStyles, '.season-hero', '(width < 600px)')
  ).toMatchObject({ 'flex-direction': 'column' });
  expect(
    declarationsForMedia(
      seriesStyles,
      '.season-hero .movie-details__image',
      '(width < 600px)'
    )
  ).toMatchObject({ width: '100%', 'max-width': 'none' });
  expect(
    declarationsForMedia(seriesStyles, '.episode-hero', '(width < 1200px)')
  ).toMatchObject({ display: 'flex', 'flex-direction': 'column' });
  expect(
    declarationsForMedia(
      seriesStyles,
      '.episode-hero .movie-details__image',
      '(width < 1200px)'
    )
  ).toMatchObject({ width: '100%', 'max-width': 'none' });
  expect(
    declarationsForSelector(seriesStyles, '.series-episode-rating')
  ).toMatchObject({ 'grid-column': '2', 'grid-row': '1/3' });
  expect(
    declarationsForSelector(
      seriesStyles,
      '.series-episode-content .series-excerpt'
    )
  ).toMatchObject({ 'grid-column': '1/-1', 'grid-row': '3' });
  expect(
    declarationsForSelector(seriesStyles, '.series-excerpt')
  ).toMatchObject({
    'white-space': 'pre-line',
    'line-height': '1.7',
  });
  expect(
    declarationsForSelector(seriesStyles, '.season-preview__facts')
  ).toMatchObject({
    display: 'flex',
    color: '#f65261',
    'text-align': 'right',
  });
  expect(
    declarationsForSelector(seriesStyles, '.season-preview__header')
  ).toMatchObject({
    display: 'flex',
    'flex-wrap': 'wrap',
    'justify-content': 'space-between',
  });
  expect(
    declarationsForSelector(seriesStyles, '.season-preview__overview')
  ).not.toHaveProperty('max-width');
  expect(
    declarationsForMedia(
      seriesStyles,
      '.series-episode-link:hover',
      '(prefers-reduced-motion: reduce)'
    )
  ).toMatchObject({ transform: 'none' });
});

test('groups Series library actions below the facts at tablet widths', () => {
  expect(
    declarationsForMedia(
      seriesStyles,
      '.movie-details__facts-actions',
      '(width < 1200px)'
    )
  ).toMatchObject({
    'align-items': 'flex-start',
    'flex-direction': 'column',
  });
  expect(
    declarationsForMedia(
      seriesStyles,
      '.personal-library-actions--expanded',
      '(width < 1200px)'
    )['margin-left']
  ).toBe('0');
});

test('places Series ratings and compact metadata below the title on mobile', () => {
  const mobileQuery = '(width < 768px)';

  expect(
    declarationsForMedia(
      seriesStyles,
      '.series-page-hero .movie-details__content',
      mobileQuery
    )
  ).toMatchObject({
    display: 'grid',
    'grid-template-columns': 'minmax(0, 1fr)',
  });
  expect(
    declarationsForMedia(
      seriesStyles,
      '.series-page-hero .movie-details__title__wrapper',
      mobileQuery
    ).display
  ).toBe('contents');
  expect(
    declarationsForMedia(
      seriesStyles,
      '.series-page-hero .series-hero-metadata',
      mobileQuery
    ).display
  ).toBe('contents');
  expect(
    declarationsForMedia(
      seriesStyles,
      '.series-page-hero .movie-details__title',
      mobileQuery
    )['grid-row']
  ).toBe('1');
  expect(
    declarationsForMedia(
      seriesStyles,
      '.series-page-hero .movie-details__genre',
      mobileQuery
    )['grid-row']
  ).toBe('2');
  expect(
    declarationsForMedia(
      seriesStyles,
      '.series-page-hero .details-ratings',
      mobileQuery
    )['grid-row']
  ).toBe('3');
  expect(
    declarationsForMedia(
      seriesStyles,
      '.series-page-hero .movie-details__facts-actions',
      mobileQuery
    )['grid-row']
  ).toBe('4');
  expect(
    declarationsForMedia(
      seriesStyles,
      '.series-page-hero .movie-details__data',
      mobileQuery
    )
  ).toMatchObject({ 'font-size': '14px', gap: '4px 8px' });
});

test('matches the Episodes heading to Media subsection typography and divider', () => {
  const episodesHeading = declarationsForSelector(
    seriesStyles,
    '.season-preview__episodes h4'
  );
  const mediaHeading = declarationsForSelector(mediaStyles, '.media-block h3');

  expect(episodesHeading).toMatchObject({
    color: mediaHeading.color,
    'font-size': mediaHeading['font-size'],
    'font-weight': mediaHeading['font-weight'],
    'letter-spacing': mediaHeading['letter-spacing'],
    'text-transform': mediaHeading['text-transform'],
    'border-bottom': '1px solid rgba(255, 255, 255, 0.12)',
    padding: '0 0 12px',
    margin: '0 0 14px',
  });
});

test('styles the Season selector as a responsive disclosure and respects reduced motion', () => {
  expect(
    declarationsForSelector(seriesStyles, '.series-season-selector__trigger')
  ).toMatchObject({
    background: '#232323',
    'min-height': '44px',
    width: '100%',
  });
  expect(
    declarationsForSelector(seriesStyles, '.series-season-selector__chevron')
  ).toMatchObject({
    'border-bottom': '2px solid #f65261',
    transform: 'rotate(45deg)',
  });
  expect(
    declarationsForSelector(
      seriesStyles,
      '.series-season-selector__trigger[aria-expanded=true] .series-season-selector__chevron'
    ).transform
  ).toBe('rotate(225deg)');
  expect(
    declarationsForSelector(seriesStyles, '.series-season-selector__options')
  ).toMatchObject({
    'max-height': 'min(60vh, 360px)',
    'overflow-y': 'auto',
    position: 'absolute',
  });
  expect(
    declarationsForSelector(
      seriesStyles,
      '.series-season-selector__options[data-open=true]'
    )
  ).toMatchObject({ visibility: 'visible', opacity: '1' });
  expect(
    declarationsForMedia(
      seriesStyles,
      '.series-season-selector__chevron',
      '(prefers-reduced-motion: reduce)'
    )
  ).toMatchObject({ transition: 'none' });
});

test('keeps detail breadcrumbs and episode navigation compact and keyboard visible', () => {
  expect(
    declarationsForSelector(seriesStyles, '.series-breadcrumbs ol')
  ).toMatchObject({ display: 'flex', 'flex-wrap': 'wrap' });
  expect(
    declarationsForSelector(seriesStyles, '.series-breadcrumbs a')
  ).toMatchObject({ 'text-decoration': 'none' });
  expect(
    declarationsForSelector(seriesStyles, '.series-breadcrumbs a:focus-visible')
  ).toMatchObject({ outline: '2px solid #f65261' });
  expect(
    declarationsForSelector(seriesStyles, '.series-neighbors')
  ).toMatchObject({ display: 'flex', 'justify-content': 'space-between' });
  expect(
    declarationsForSelector(seriesStyles, '.series-neighbors a:focus-visible')
  ).toMatchObject({ outline: '2px solid #f65261' });
  expect(
    declarationsForMedia(seriesStyles, '.series-neighbors a', '(width < 600px)')
  ).toMatchObject({ 'flex-basis': '100%', 'max-width': '100%' });
});

test('keeps episode separators between rows and removes the final row border', () => {
  expect(
    declarationsForSelector(seriesStyles, '.series-episodes > li')[
      'border-bottom'
    ]
  ).toBe('1px solid rgba(255, 255, 255, 0.16)');
  expect(
    declarationsForSelector(seriesStyles, '.series-episodes > li:last-child')[
      'border-bottom'
    ]
  ).toBe('0');
  expect(
    declarationsForSelector(
      seriesStyles,
      '.series-episodes > li:has(> .series-episode-link:is(:hover, :focus-visible, :focus-within))'
    )['border-bottom-color']
  ).toBe('transparent');
});

test('centers the season details action and removes its link underline in every state', () => {
  expect(
    declarationsForSelector(seriesStyles, '.season-preview__actions')
  ).toMatchObject({ display: 'flex', 'justify-content': 'center' });

  ['', ':link', ':visited', ':hover', ':focus', ':active'].forEach((state) => {
    expect(
      declarationsForSelector(
        seriesStyles,
        `.season-preview__actions a${state}`
      )
    ).toMatchObject({ 'text-decoration': 'none' });
  });
});
