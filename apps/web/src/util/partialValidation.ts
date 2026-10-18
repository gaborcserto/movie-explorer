import type { SectionAvailability } from '@movie-explorer/contracts';

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function availability(value: unknown): value is SectionAvailability {
  if (!record(value)) return false;
  if (value.status === 'available')
    return value.retryAfterSeconds === undefined;
  return (
    value.status === 'unavailable' &&
    (value.retryAfterSeconds === undefined ||
      (typeof value.retryAfterSeconds === 'number' &&
        Number.isSafeInteger(value.retryAfterSeconds) &&
        value.retryAfterSeconds > 0 &&
        value.retryAfterSeconds <= 86400))
  );
}

export function availabilityMap(value: unknown, keys: string[]): boolean {
  return record(value) && keys.every((key) => availability(value[key]));
}

function strings(value: unknown): boolean {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function named(value: unknown): boolean {
  return (
    record(value) &&
    typeof value.name === 'string' &&
    (value.id === undefined ||
      (typeof value.id === 'number' &&
        Number.isSafeInteger(value.id) &&
        value.id > 0)) &&
    ['profileUrl', 'profileSrcSet', 'character'].every(
      (key) => value[key] === undefined || typeof value[key] === 'string'
    )
  );
}

export function movieSection(value: unknown, section: string): boolean {
  if (!record(value)) return false;
  if (section === 'credits')
    return (
      strings(value.cast) &&
      ['castMembers', 'directors', 'writers', 'producers'].every(
        (key) =>
          value[key] === undefined ||
          (Array.isArray(value[key]) &&
            value[key].every(
              (item: unknown) =>
                named(item) &&
                (!['writers', 'producers'].includes(key) ||
                  (record(item) && strings(item.roles)))
            ))
      ) &&
      (value.director === undefined || typeof value.director === 'string')
    );
  const items = value[section];
  return (
    Array.isArray(items) &&
    items.every(
      (item: unknown) =>
        record(item) &&
        (section === 'photos'
          ? typeof item.fullUrl === 'string' &&
            typeof item.thumbnailUrl === 'string' &&
            (item.alt === undefined || typeof item.alt === 'string')
          : typeof item.name === 'string' &&
            typeof item.url === 'string' &&
            (item.thumbnailUrl === undefined ||
              typeof item.thumbnailUrl === 'string'))
    )
  );
}

export function filmography(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (item: unknown) =>
        record(item) &&
        typeof item.id === 'number' &&
        Number.isSafeInteger(item.id) &&
        item.id > 0 &&
        typeof item.title === 'string' &&
        typeof item.posterUrl === 'string' &&
        strings(item.genres) &&
        ['posterSrcSet', 'releaseDate'].every(
          (key) => item[key] === undefined || typeof item[key] === 'string'
        ) &&
        (item.actingCredits === undefined || strings(item.actingCredits)) &&
        Array.isArray(item.crewCredits) &&
        item.crewCredits.every(
          (credit: unknown) =>
            record(credit) &&
            ['department', 'job'].every(
              (key) =>
                credit[key] === undefined || typeof credit[key] === 'string'
            )
        )
    )
  );
}

export function optionalText(
  value: Record<string, unknown>,
  keys: string[]
): boolean {
  return keys.every(
    (key) => value[key] === undefined || typeof value[key] === 'string'
  );
}
