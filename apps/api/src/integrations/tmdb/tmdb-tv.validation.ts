import type { TmdbTvDetails } from './tmdb-tv.types';

export function tvRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function tvText(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() || null : null;
}

export function tvCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

export function tvId(value: unknown): number | undefined {
  const count = tvCount(value);
  return count !== null && count > 0 ? count : undefined;
}

export function tvDate(value: unknown): string | null {
  const date = tvText(value);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  const parsed = new Date(date);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
    ? date
    : null;
}

export function validateTmdbTvDetails(
  body: unknown,
  requestedId: number,
): asserts body is TmdbTvDetails {
  const record = tvRecord(body);
  if (
    !record ||
    record.success === false ||
    tvId(record.id) !== requestedId ||
    !tvText(record.name)
  ) {
    throw new Error('Invalid TV series identity');
  }

  const coordinates = new Map<number, number>();
  if (Array.isArray(record.seasons)) {
    for (const value of record.seasons) {
      const season = tvRecord(value);
      const number = tvCount(season?.season_number);
      const id = tvId(season?.id);
      if (number === null || id === undefined) {
        continue;
      }
      const previous = coordinates.get(number);
      if (previous !== undefined && previous !== id) {
        throw new Error('Conflicting TV season identities');
      }
      coordinates.set(number, id);
    }
  }
}
