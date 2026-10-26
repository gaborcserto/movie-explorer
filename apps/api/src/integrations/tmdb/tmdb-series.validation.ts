import type {
  TmdbSeriesDetails,
  TmdbSeason,
  TmdbEpisode,
} from './tmdb-series.types';

export function seriesRecord(
  value: unknown,
): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function validateTmdbEpisode(
  body: unknown,
  seriesId: number,
  season: number,
  episode?: number,
): asserts body is TmdbEpisode {
  const row = seriesRecord(body);

  if (
    !row ||
    row.success === false ||
    !seriesPositiveId(row.id) ||
    !seriesText(row.name) ||
    row.season_number !== season ||
    !seriesPositiveId(row.episode_number) ||
    (episode !== undefined && row.episode_number !== episode) ||
    (row.show_id !== undefined && row.show_id !== seriesId)
  ) {
    throw new Error('Invalid episode identity or coordinates');
  }
}

export function validateTmdbSeason(
  body: unknown,
  seriesId: number,
  season: number,
): asserts body is TmdbSeason {
  const row = seriesRecord(body);

  if (
    !row ||
    row.success === false ||
    !seriesPositiveId(row.id) ||
    !seriesText(row.name) ||
    row.season_number !== season ||
    !Array.isArray(row.episodes)
  ) {
    throw new Error('Invalid season identity or episodes');
  }

  const coordinates = new Map<number, number>();
  const identities = new Map<number, number>();

  for (const value of row.episodes) {
    validateTmdbEpisode(value, seriesId, season);

    if (
      (coordinates.has(value.episode_number) &&
        coordinates.get(value.episode_number) !== value.id) ||
      (identities.has(value.id) &&
        identities.get(value.id) !== value.episode_number)
    ) {
      throw new Error('Conflicting episode identities');
    }
    coordinates.set(value.episode_number, value.id);
    identities.set(value.id, value.episode_number);
  }
}

export function seriesText(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() || null : null;
}

export function seriesCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

export function seriesPositiveId(value: unknown): number | undefined {
  const count = seriesCount(value);

  return count !== null && count > 0 ? count : undefined;
}

export function seriesDate(value: unknown): string | null {
  const date = seriesText(value);

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  const parsed = new Date(date);

  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
    ? date
    : null;
}

export function validateTmdbSeriesDetails(
  body: unknown,
  requestedId: number,
): asserts body is TmdbSeriesDetails {
  const record = seriesRecord(body);

  if (
    !record ||
    record.success === false ||
    seriesPositiveId(record.id) !== requestedId ||
    !seriesText(record.name)
  ) {
    throw new Error('Invalid series identity');
  }

  const coordinates = new Map<number, number>();

  if (Array.isArray(record.seasons)) {
    for (const value of record.seasons) {
      const season = seriesRecord(value);
      const number = seriesCount(season?.season_number);
      const id = seriesPositiveId(season?.id);

      if (number === null || id === undefined) {
        continue;
      }
      const previous = coordinates.get(number);

      if (previous !== undefined && previous !== id) {
        throw new Error('Conflicting series season identities');
      }
      coordinates.set(number, id);
    }
  }
}
