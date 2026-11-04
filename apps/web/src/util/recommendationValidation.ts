import type {
  MovieCollectionResponse,
  PersonalizedRecommendationResponse,
  RecommendationCategory,
  RecommendationResponse,
  RelatedTitlesResponse,
} from '@movie-explorer/contracts';

import { record } from './partialValidation';
import { searchResult } from './searchValidation';

export function movieCollectionResponse(
  value: unknown,
  movieId: number
): value is MovieCollectionResponse {
  if (
    !record(value) ||
    !['available', 'partial'].includes(String(value.availability)) ||
    !Array.isArray(value.results) ||
    !value.results.every(
      (item) =>
        searchResult(item) && item.mediaType === 'movie' && item.id !== movieId
    ) ||
    new Set(value.results.map((item) => item.id)).size !== value.results.length
  ) {
    return false;
  }

  if (value.collection === null) {
    return value.results.length === 0;
  }

  const { collection } = value;

  return (
    record(collection) &&
    typeof collection.id === 'number' &&
    Number.isSafeInteger(collection.id) &&
    collection.id > 0 &&
    ['name', 'posterUrl', 'backdropUrl'].every(
      (key) =>
        collection[key] === undefined || typeof collection[key] === 'string'
    )
  );
}

export function relatedTitlesResponse(
  value: unknown,
  mediaType: 'movie' | 'tv'
): value is RelatedTitlesResponse {
  return (
    record(value) &&
    (value.availability === 'available' || value.availability === 'partial') &&
    Array.isArray(value.results) &&
    value.results.length <= 10 &&
    value.results.every(
      (item) => searchResult(item) && item.mediaType === mediaType
    )
  );
}

export function recommendationResponse(
  value: unknown,
  category: RecommendationCategory
): value is RecommendationResponse {
  return (
    relatedTitlesResponse(
      value,
      category.endsWith('movies') ? 'movie' : 'tv'
    ) &&
    record(value) &&
    value.category === category &&
    Number.isSafeInteger(value.candidateCount) &&
    Number(value.candidateCount) >= value.results.length &&
    Number(value.candidateCount) <= 100
  );
}

export function personalizedRecommendationResponse(
  value: unknown,
  mediaType: 'movie' | 'tv'
): value is PersonalizedRecommendationResponse {
  return (
    relatedTitlesResponse(value, mediaType) &&
    record(value) &&
    value.mediaType === mediaType &&
    ['favorites', 'mixed', 'popular'].includes(String(value.source)) &&
    value.results.every((title) => Boolean(title.posterUrl?.trim())) &&
    new Set(value.results.map((title) => title.id)).size ===
      value.results.length
  );
}
