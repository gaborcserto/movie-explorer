import type { TitleSignals } from '../../recommendations/title-ranking';
import { searchRecord } from './tmdb-search.mapper';
import { seriesDate } from './tmdb-series.validation';

export function rankingSignals(
  value: unknown,
  mediaType: 'movie' | 'tv',
): TitleSignals {
  const row = searchRecord(value);

  if (!row) {
    return {};
  }

  const rawGenres = Array.isArray(row.genre_ids) ? row.genre_ids : row.genres;
  const genreIds = Array.isArray(rawGenres)
    ? rawGenres.flatMap((genre: unknown) => {
        const id = typeof genre === 'number' ? genre : searchRecord(genre)?.id;

        return typeof id === 'number' && Number.isSafeInteger(id) && id > 0
          ? [id]
          : [];
      })
    : [];
  const date = seriesDate(
    mediaType === 'movie' ? row.release_date : row.first_air_date,
  );
  const voteCount =
    typeof row.vote_count === 'number' &&
    Number.isSafeInteger(row.vote_count) &&
    row.vote_count >= 0
      ? row.vote_count
      : undefined;
  const rating =
    typeof row.vote_average === 'number' &&
    Number.isFinite(row.vote_average) &&
    row.vote_average > 0 &&
    row.vote_average <= 10 &&
    voteCount !== 0
      ? row.vote_average
      : undefined;
  const popularity =
    typeof row.popularity === 'number' &&
    Number.isFinite(row.popularity) &&
    row.popularity >= 0
      ? row.popularity
      : undefined;

  return {
    genreIds: [...new Set(genreIds)],
    rating,
    voteCount,
    popularity,
    year: date ? Number(date.slice(0, 4)) : undefined,
  };
}
