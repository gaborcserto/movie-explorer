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
