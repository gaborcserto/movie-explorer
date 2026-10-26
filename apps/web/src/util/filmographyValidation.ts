import type {
  CombinedFilmography,
  FilmographyMediaType,
} from '@movie-explorer/contracts';

import { record, availability, filmography } from './partialValidation';

function nullableCount(value: unknown) {
  return (
    value === null ||
    (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
  );
}

function nullableText(value: unknown) {
  return value === null || typeof value === 'string';
}

export default function combinedFilmography(
  value: unknown,
  mediaType: FilmographyMediaType = 'all'
): value is CombinedFilmography {
  if (
    !record(value) ||
    !record(value.groups) ||
    !Array.isArray(value.entries)
  ) {
    return false;
  }
  const { groups } = value;
  const requested = mediaType === 'all' ? ['movie', 'tv'] : [mediaType];

  if (
    !requested.every((type) => availability(groups[type])) ||
    Object.keys(value.groups).some((type) => !requested.includes(type))
  ) {
    return false;
  }
  const seen = new Set<string>();

  return value.entries.every((entry: unknown) => {
    if (
      !record(entry) ||
      (entry.mediaType !== 'movie' && entry.mediaType !== 'tv') ||
      !requested.includes(entry.mediaType)
    ) {
      return false;
    }
    const key = `${entry.mediaType}:${entry.id}`;

    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    if (entry.mediaType === 'movie') {
      return filmography([entry]);
    }
    if (
      !filmography([{ ...entry, posterUrl: entry.posterUrl ?? '' }]) ||
      !nullableText(entry.posterUrl) ||
      !nullableText(entry.originalTitle)
    ) {
      return false;
    }
    const date = entry.firstAirDate;

    if (
      date !== null &&
      (typeof date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date)
    ) {
      return false;
    }

    return (
      (entry.actingRoles === undefined ||
        (Array.isArray(entry.actingRoles) &&
          entry.actingRoles.every(
            (role: unknown) =>
              record(role) &&
              nullableText(role.creditId) &&
              nullableText(role.character) &&
              nullableCount(role.episodeCount)
          ))) &&
      Array.isArray(entry.crewCredits) &&
      entry.crewCredits.every(
        (credit: unknown) =>
          record(credit) &&
          (credit.episodeCount === undefined ||
            nullableCount(credit.episodeCount)) &&
          (credit.creditId === undefined || typeof credit.creditId === 'string')
      )
    );
  });
}
