import type { SearchResult } from '@movie-explorer/contracts';

import { rankStreaming } from './tmdb-streaming-ranking';

const now = Date.parse('2026-11-08');

const movie = (
  id: number,
  popularity = 100,
  releaseDate = '2026-01-01',
): SearchResult => ({
  mediaType: 'movie',
  id,
  title: String(id),
  popularity,
  releaseDate,
});

const tv = (id: number, firstAirDate = '2005-01-01'): SearchResult => ({
  mediaType: 'tv',
  id,
  title: String(id),
  popularity: 100,
  firstAirDate,
});

describe('bounded streaming ranking', () => {
  it('balances popularity and release recency instead of selecting obscure new titles', () => {
    expect(
      rankStreaming(
        [movie(1, 100, '1971-01-01'), movie(2), movie(3, 0.01)],
        new Set(),
        now,
      ).map((item) => item.id),
    ).toEqual([2, 1, 3]);
  });

  it('boosts long-running or revived series with recent broadcast evidence, not status', () => {
    expect(
      rankStreaming([tv(1), tv(2), tv(3, '2025-01-01')], new Set([2]), now).map(
        (item) => item.id,
      ),
    ).toEqual([2, 3, 1]);
  });

  it.each([undefined, 'invalid', '2026-02-30', '2030-01-01'])(
    'gives no recency boost for missing, invalid or future dates: %s',
    (date) => {
      expect(
        rankStreaming([tv(1, date ?? ''), movie(2)], new Set(), now)[0].id,
      ).toBe(2);
    },
  );

  it('deduplicates composite identities and breaks ties independently of incoming order', () => {
    const entries = [movie(2), movie(1), movie(1), tv(1, '2026-01-01')];

    expect(
      rankStreaming(entries, new Set(), now).map(
        (item) => `${item.mediaType}:${item.id}`,
      ),
    ).toEqual(['movie:1', 'movie:2', 'tv:1']);
    expect(rankStreaming(entries, new Set(), now)).toEqual(
      rankStreaming([...entries].reverse(), new Set(), now),
    );
  });
});
