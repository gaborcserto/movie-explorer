import {
  normalizeSearchFilters,
  readFilters,
  readSearchView,
  writeFilters,
} from './filterState';

test.each(['all', 'tv', 'people'])(
  'restores %s and normalizes repeated/invalid filters without losing unrelated params',
  (view) => {
    const params = new URLSearchParams(
      `view=${view}&view=invalid&filter=drama&year=wrong&rating=8&extra=a&extra=b&sorting=title&order=asc`
    );
    const next = normalizeSearchFilters(params, true);
    expect(readSearchView(next)).toBe(view);
    expect(next.getAll('view')).toEqual([view]);
    expect(next.get('filter')).toBe('drama');
    expect(next.get('rating')).toBe('8');
    expect(next.has('year')).toBe(false);
    expect(next.has('sorting')).toBe(false);
    expect(next.has('order')).toBe(false);
    expect(next.getAll('extra')).toEqual(['a', 'b']);
    expect(normalizeSearchFilters(next, true).toString()).toBe(next.toString());
  }
);
test.each(['invalid', 'series', 'movies', ''])(
  'canonicalizes invalid/default view %s to legacy Movies',
  (view) => {
    const next = normalizeSearchFilters(
      new URLSearchParams(`view=${view}&year=2005`),
      true
    );
    expect(next.toString()).toBe('year=2005');
    expect(readSearchView(next)).toBe('movies');
  }
);
test('Series year changes preserve dormant Movie selections and unrelated repeated state', () => {
  const params = new URLSearchParams(
    'view=tv&filter=drama&rating=8&year=2005&extra=a&extra=b'
  );
  const next = writeFilters(
    params,
    { ...readFilters(params, true), year: '2010' },
    true
  );
  expect(next.toString()).toBe(
    'view=tv&filter=drama&rating=8&year=2010&extra=a&extra=b'
  );
});

test('normalizes multi-genre selection in genre order without duplicates', () => {
  const filters = readFilters(
    new URLSearchParams('filter=drama%2Caction&filter=drama'),
    false
  );

  expect(filters.filter).toEqual(['action', 'drama']);
  expect(
    writeFilters(new URLSearchParams(), filters, false).get('filter')
  ).toBe('action,drama');
});

test.each([
  ['default sorting', 'popularity', 'desc', ''],
  ['explicit ascending order', 'title', 'asc', 'sorting=title&order=asc'],
  ['explicit descending order', 'title', 'desc', 'sorting=title&order=desc'],
])(
  'round trips %s through canonical URL parameters',
  (_, sorting, order, expected) => {
    const params = new URLSearchParams(
      expected || 'sorting=popularity&order=desc'
    );
    const filters = readFilters(params, false);

    expect(filters.sorting).toBe(sorting);
    expect(filters.order).toBe(order);
    expect(writeFilters(params, filters, false).toString()).toBe(expected);
  }
);

test('forces relevance sorting and omits sort parameters in search mode', () => {
  const params = new URLSearchParams('sorting=title&order=asc');
  const filters = readFilters(params, true);

  expect(filters.sorting).toBe('popularity');
  expect(filters.order).toBe('desc');
  expect(writeFilters(params, filters, true).toString()).toBe('');
});

test('normalizes invalid sorting and order to the default sort and order', () => {
  const filters = readFilters(
    new URLSearchParams('sorting=unknown&order=invalid'),
    false
  );

  expect(filters.sorting).toBe('popularity');
  expect(filters.order).toBe('desc');
});
