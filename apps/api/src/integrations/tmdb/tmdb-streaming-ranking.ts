import type { SearchResult } from '@movie-explorer/contracts';

import { seriesDate } from './tmdb-series.validation';

/** Rank the complete bounded pool before slicing pages. Activity is episode-based, not availability. */
export function rankStreaming(
  items: SearchResult[],
  activeSeries: Set<number>,
  now: number,
): SearchResult[] {
  const unique = new Map<string, SearchResult>();

  for (const item of items) {
    const key = `${item.mediaType}:${item.id}`;

    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  const candidates = [...unique.values()];

  const popularity = (item: SearchResult) =>
    Math.log1p(
      Math.max(
        0,
        Number.isFinite(item.popularity) ? (item.popularity ?? 0) : 0,
      ),
    );
  const maximum = Math.max(1, ...candidates.map(popularity));

  const score = (item: SearchResult) => {
    const date =
      item.mediaType === 'movie'
        ? item.releaseDate
        : item.mediaType === 'tv'
          ? item.firstAirDate
          : undefined;
    const timestamp = date && seriesDate(date) ? Date.parse(date) : NaN;
    const age = (now - timestamp) / 86400000;
    const recency = Number.isFinite(age) && age >= 0 ? Math.exp(-age / 730) : 0;
    const activity =
      item.mediaType === 'tv' && activeSeries.has(item.id) ? 1 : recency;

    // Popularity leads; two-year decay gives established recent titles room to compete.
    return (0.65 * popularity(item)) / maximum + 0.35 * activity;
  };

  return candidates.sort(
    (a, b) =>
      score(b) - score(a) ||
      a.mediaType.localeCompare(b.mediaType) ||
      a.id - b.id,
  );
}
