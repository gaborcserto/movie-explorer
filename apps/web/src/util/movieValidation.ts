import type {
  MovieDetails,
  MovieSummary,
  MovieListResponse,
  MovieSuggestionsResponse,
  PersonDetails,
  PersonListResponse,
} from '@movie-explorer/contracts';

import { filmography, optionalText, record } from './partialValidation';
import { searchResult } from './searchValidation';

function identity(value: Record<string, unknown>): boolean {
  return (
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    value.id > 0
  );
}

function pagination(value: Record<string, unknown>): boolean {
  return ['page', 'totalPages', 'totalResults'].every(
    (key) =>
      Number.isSafeInteger(value[key]) &&
      Number(value[key]) >= (key === 'page' ? 1 : 0)
  );
}

function movieSummary(value: unknown): value is MovieSummary {
  return (
    record(value) &&
    identity(value) &&
    typeof value.title === 'string' &&
    typeof value.posterUrl === 'string' &&
    Array.isArray(value.genres) &&
    value.genres.every((genre: unknown) => typeof genre === 'string') &&
    optionalText(value, ['releaseDate', 'posterSrcSet'])
  );
}

export function movieList(value: unknown): value is MovieListResponse {
  return (
    record(value) &&
    pagination(value) &&
    Array.isArray(value.movies) &&
    value.movies.every(movieSummary)
  );
}

export function peopleList(value: unknown): value is PersonListResponse {
  return (
    record(value) &&
    pagination(value) &&
    Array.isArray(value.people) &&
    value.people.every(
      (person: unknown) =>
        record(person) && searchResult({ ...person, mediaType: 'person' })
    )
  );
}

export function movieSuggestions(
  value: unknown
): value is MovieSuggestionsResponse {
  return (
    record(value) &&
    Array.isArray(value.suggestions) &&
    value.suggestions.every(
      (movie: unknown) =>
        record(movie) && searchResult({ ...movie, mediaType: 'movie' })
    )
  );
}

export function movieCore(value: unknown, id: number): value is MovieDetails {
  return (
    movieSummary(value) &&
    value.id === id &&
    record(value) &&
    optionalText(value, ['description', 'posterPreviewUrl', 'backdropUrl']) &&
    ['rating', 'runtimeMinutes'].every(
      (key) =>
        value[key] === undefined ||
        (typeof value[key] === 'number' && Number.isFinite(value[key]))
    )
  );
}

export function personCore(value: unknown, id: number): value is PersonDetails {
  return (
    record(value) &&
    identity(value) &&
    value.id === id &&
    typeof value.name === 'string' &&
    optionalText(value, [
      'biography',
      'knownForDepartment',
      'birthday',
      'deathDate',
      'placeOfBirth',
      'profileUrl',
      'profileSrcSet',
    ]) &&
    // Legacy credits can retain an unlinked entry with ID zero.
    filmography(value.filmography, value.filmographyAvailability === undefined)
  );
}
