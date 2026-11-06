import type {
  RecommendationCategory,
  RecommendationResponse,
  RecommendationTitle,
} from '@movie-explorer/contracts';

import type { TitleSignals } from './title-ranking';

/** Ordered application data; provider pagination and cache details stay private. */
export interface RecommendationPool {
  results: readonly RecommendationTitle[];
  availability: RecommendationResponse['availability'];
  signals?: ReadonlyMap<number, TitleSignals>;
}

export interface RankedRecommendationPool extends RecommendationPool {
  results: RecommendationTitle[];
  sourceSignals?: TitleSignals;
  scores?: ReadonlyMap<number, number>;
}

export interface RecommendationProvider {
  findFavoriteSimilar(
    mediaType: 'movie' | 'tv',
    id: number,
  ): Promise<RankedRecommendationPool>;
  findRecommendationPool(
    category: RecommendationCategory,
  ): Promise<RecommendationPool>;
}
