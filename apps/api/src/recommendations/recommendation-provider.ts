import type {
  RecommendationCategory,
  RecommendationResponse,
  RecommendationTitle,
  RelatedTitlesResponse,
} from '@movie-explorer/contracts';

/** Ordered application data; provider pagination and cache details stay private. */
export interface RecommendationPool {
  results: readonly RecommendationTitle[];
  availability: RecommendationResponse['availability'];
}

export interface RecommendationProvider {
  findFavoriteSimilar(
    mediaType: 'movie' | 'tv',
    id: number,
  ): Promise<RelatedTitlesResponse>;
  findRecommendationPool(
    category: RecommendationCategory,
  ): Promise<RecommendationPool>;
}
