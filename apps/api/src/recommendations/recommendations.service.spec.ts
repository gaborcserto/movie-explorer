import { BadGatewayException } from '@nestjs/common';
import type {
  RecommendationCategory,
  RecommendationTitle,
} from '@movie-explorer/contracts';

import { RecommendationsService } from './recommendations.service';

describe('RecommendationsService', () => {
  const provider = { findRecommendationPool: jest.fn() };
  const service = new RecommendationsService(provider);

  beforeEach(() => jest.resetAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it.each<RecommendationCategory>([
    'popular-movies',
    'top-rated-movies',
    'popular-series',
    'top-rated-series',
  ])('routes %s and resamples the pool on every request', async (category) => {
    const results: RecommendationTitle[] = Array.from(
      { length: 100 },
      (_, index) => ({ id: index + 1, mediaType: 'movie', title: 'Movie' }),
    );
    provider.findRecommendationPool.mockResolvedValue({
      results,
      availability: 'available',
    });
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const first = await service.find(category);
    jest.spyOn(Math, 'random').mockReturnValue(0.999);
    const second = await service.find(category);

    expect(provider.findRecommendationPool).toHaveBeenCalledWith(category);
    expect(first).toMatchObject({
      category,
      candidateCount: 100,
      availability: 'available',
    });
    expect(first.results).toHaveLength(10);
    expect(first.results).not.toEqual(second.results);
    expect(results[0].id).toBe(1);
  });

  it('retains explicit partial availability', async () => {
    provider.findRecommendationPool.mockResolvedValue({
      results: [{ id: 1, title: 'Series', mediaType: 'tv' }],
      availability: 'partial',
    });

    expect(await service.find('popular-series')).toEqual({
      category: 'popular-series',
      availability: 'partial',
      candidateCount: 1,
      results: [{ id: 1, title: 'Series', mediaType: 'tv' }],
    });
  });

  it('does not turn complete failure into an empty success', async () => {
    const error = new BadGatewayException();
    provider.findRecommendationPool.mockRejectedValue(error);

    await expect(service.find('popular-movies')).rejects.toBe(error);
  });
});
