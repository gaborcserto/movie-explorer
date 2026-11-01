import type {
  RecommendationCategory,
  RecommendationResponse,
  RecommendationTitle,
} from '@movie-explorer/contracts';

/** Ordered application data; provider pagination and cache details stay private. */
export interface RecommendationPool {
  results: readonly RecommendationTitle[];
  availability: RecommendationResponse['availability'];
}

export interface RecommendationProvider {
  findRecommendationPool(
    category: RecommendationCategory,
  ): Promise<RecommendationPool>;
}
