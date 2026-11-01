import { Inject, Injectable } from '@nestjs/common';
import type {
  RecommendationCategory,
  RecommendationResponse,
} from '@movie-explorer/contracts';

import { DISCOVERY_PROVIDER } from '../discovery/discovery.tokens';
import type { RecommendationProvider } from './recommendation-provider';
import { sampleTitles } from './sample-titles';

@Injectable()
export class RecommendationsService {
  constructor(
    @Inject(DISCOVERY_PROVIDER)
    private readonly provider: RecommendationProvider,
  ) {}

  async find(
    category: RecommendationCategory,
  ): Promise<RecommendationResponse> {
    const pool = await this.provider.findRecommendationPool(category);

    return {
      category,
      results: sampleTitles(pool.results),
      availability: pool.availability,
      candidateCount: pool.results.length,
    };
  }
}
