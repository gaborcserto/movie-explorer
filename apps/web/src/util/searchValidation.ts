import type { SearchResponse, SearchResult } from '@movie-explorer/contracts';

import { optionalText, record } from './partialValidation';

export function searchResult(value: unknown): value is SearchResult {
  if (!record(value) || !Number.isSafeInteger(value.id) || Number(value.id) < 1)
    return false;
  if (
    !optionalText(value, [
      'posterUrl',
      'profileUrl',
      'knownForDepartment',
      'description',
      'releaseDate',
      'firstAirDate',
    ])
  )
    return false;
  if (
    !['popularity', 'rating'].every(
      (key) =>
        value[key] === undefined ||
        (typeof value[key] === 'number' &&
          Number.isFinite(value[key]) &&
          value[key] >= 0 &&
          (key !== 'rating' || value[key] <= 10))
    )
  )
    return false;
  if (value.mediaType === 'person')
    return typeof value.name === 'string' && Boolean(value.name.trim());
  return (
    (value.mediaType === 'movie' || value.mediaType === 'tv') &&
    typeof value.title === 'string' &&
    Boolean(value.title.trim()) &&
    (value.releaseYear === undefined ||
      (Number.isSafeInteger(value.releaseYear) &&
        Number(value.releaseYear) >= 1000 &&
        Number(value.releaseYear) <= 9999))
  );
}

export function searchResponse(value: unknown): value is SearchResponse {
  return (
    record(value) &&
    Array.isArray(value.results) &&
    value.results.every(searchResult) &&
    ['page', 'totalPages', 'totalResults'].every(
      (key) =>
        Number.isSafeInteger(value[key]) &&
        Number(value[key]) >= (key === 'page' ? 1 : 0)
    ) &&
    Number(value.page) <= 500 &&
    Number(value.totalPages) <= 500
  );
}
