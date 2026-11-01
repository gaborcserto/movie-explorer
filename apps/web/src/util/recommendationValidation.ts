import type {
  RecommendationCategory,
  RecommendationResponse,
  RelatedTitlesResponse,
} from '@movie-explorer/contracts';

import { record } from './partialValidation';
import { searchResult } from './searchValidation';

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
