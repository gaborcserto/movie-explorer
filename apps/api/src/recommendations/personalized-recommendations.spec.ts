import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
} from '@nestjs/common';
import type {
  PersonalizedRecommendationRequest,
  RecommendationTitle,
  RelatedTitlesResponse,
} from '@movie-explorer/contracts';

import { RecommendationsService } from './recommendations.service';

function title(
  id: number,
  mediaType: 'movie' | 'tv' = 'movie',
): RecommendationTitle {
  return { id, mediaType, title: `Title ${id}`, posterUrl: '/poster.jpg' };
}

function response(
  results: RecommendationTitle[] = [],
  availability: 'available' | 'partial' = 'available',
): RelatedTitlesResponse {
  return { results, availability };
}

describe('Favorites-based recommendations', () => {
  const provider = {
    findRecommendationPool: jest.fn(),
    findFavoriteSimilar: jest.fn(),
  };
  const service = new RecommendationsService(provider);
  const preferences: PersonalizedRecommendationRequest = {
    mediaType: 'movie',
    favoriteIds: [1, 2, 3],
    excludedIds: [1, 2, 3, 4],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    provider.findFavoriteSimilar.mockResolvedValue(response());
    provider.findRecommendationPool.mockResolvedValue(response());
  });

  it.each(['movie', 'tv'] as const)(
    'uses only the selected %s seeds and Popular pool',
    async (mediaType) => {
      provider.findFavoriteSimilar.mockResolvedValue(
        response([title(8, mediaType)]),
      );
      provider.findRecommendationPool.mockResolvedValue(
        response([title(8, mediaType), title(9, mediaType)]),
      );
      const result = await service.personalize({ ...preferences, mediaType });

      expect(result).toEqual({
        mediaType,
        source: 'mixed',
        availability: 'available',
        results: [title(8, mediaType), title(9, mediaType)],
      });
      expect(provider.findFavoriteSimilar.mock.calls).toEqual([
        [mediaType, 1],
        [mediaType, 2],
        [mediaType, 3],
      ]);
      expect(provider.findRecommendationPool).toHaveBeenCalledWith(
        mediaType === 'movie' ? 'popular-movies' : 'popular-series',
      );
    },
  );

  it('uses Popular without Similar when Favorites are empty, excluding Watched and posterless titles', async () => {
    provider.findRecommendationPool.mockResolvedValue(
      response([
        title(4),
        title(5),
        { ...title(6), posterUrl: '' },
        title(5),
        title(7, 'tv'),
      ]),
    );
    const result = await service.personalize({
      ...preferences,
      favoriteIds: [],
    });

    expect(result.results).toEqual([title(5)]);
    expect(result.source).toBe('popular');
    expect(provider.findFavoriteSimilar).not.toHaveBeenCalled();
  });

  it('ranks overlap before mean source position and deterministic IDs, regardless of seed arrival', async () => {
    provider.findFavoriteSimilar.mockImplementation(
      async (_type: string, id: number) => {
        if (id === 1) {
          await Promise.resolve();

          return response([title(10), title(20), title(30), title(40)]);
        }
        if (id === 2) {
          return response([title(20), title(10), title(50)]);
        }

        return response([title(60), title(30)]);
      },
    );
    const first = await service.personalize(preferences);
    const second = await service.personalize({
      ...preferences,
      favoriteIds: [3, 1, 2],
    });

    expect(first.results.map((item) => item.id)).toEqual([
      10, 20, 30, 60, 50, 40,
    ]);
    expect(second).toEqual(first);
  });

  it('counts each candidate once per seed and excludes seed, saved, invalid and wrong-media titles', async () => {
    provider.findFavoriteSimilar.mockResolvedValue(
      response([
        title(1),
        title(4),
        title(8),
        title(8),
        title(0),
        { ...title(9), posterUrl: undefined },
        title(10, 'tv'),
      ]),
    );
    const result = await service.personalize(preferences);

    expect(result.results).toEqual([title(8)]);
  });

  it('keeps ten personalized results and avoids unnecessary Popular requests', async () => {
    provider.findFavoriteSimilar.mockResolvedValue(
      response(Array.from({ length: 10 }, (_, index) => title(index + 10))),
    );
    const result = await service.personalize(preferences);

    expect(result.results).toHaveLength(10);
    expect(result.source).toBe('favorites');
    expect(provider.findRecommendationPool).not.toHaveBeenCalled();
  });

  it('fills remaining slots without duplicates or an unlimited refill loop', async () => {
    provider.findFavoriteSimilar.mockResolvedValue(
      response([title(10), title(11)]),
    );
    provider.findRecommendationPool.mockResolvedValue(
      response([
        title(10),
        ...Array.from({ length: 20 }, (_, index) => title(index + 11)),
      ]),
    );
    const result = await service.personalize(preferences);

    expect(result.results).toHaveLength(10);
    expect(result.results.slice(0, 2)).toEqual([title(10), title(11)]);
    expect(new Set(result.results.map((item) => item.id)).size).toBe(10);
    expect(provider.findRecommendationPool).toHaveBeenCalledTimes(1);
  });

  it('returns honestly fewer titles on exhaustion, including an available empty pool', async () => {
    expect(await service.personalize(preferences)).toEqual({
      mediaType: 'movie',
      source: 'popular',
      availability: 'available',
      results: [],
    });
    expect(provider.findRecommendationPool).toHaveBeenCalledTimes(1);
  });

  it('ranks fallback by multiple seed genres and quality, preserving exclusions and stable diversity', async () => {
    provider.findFavoriteSimilar.mockImplementation(
      async (_type: string, id: number) => ({
        ...response([title(10)]),
        sourceSignals: {
          genreIds: id === 1 ? [27] : [80, 18],
          rating: 8.8,
          voteCount: 10000,
        },
      }),
    );
    provider.findRecommendationPool.mockResolvedValue({
      ...response([
        title(4),
        title(20),
        title(30),
        title(40),
        title(40),
        title(50, 'tv'),
      ]),
      signals: new Map([
        [20, { genreIds: [35], rating: 5.1, voteCount: 1000 }],
        [30, { genreIds: [80, 18], rating: 8.2, voteCount: 10000 }],
        [40, { genreIds: [27], rating: 7.5, voteCount: 10000 }],
      ]),
    });

    const first = await service.personalize(preferences);
    const second = await service.personalize({
      ...preferences,
      favoriteIds: [3, 1, 2],
    });

    expect(first.results.map(({ id }) => id)).toEqual([10, 30, 40, 20]);
    expect(second).toEqual(first);
    expect(first.source).toBe('mixed');
    expect(new Set(first.results.map(({ id }) => id)).size).toBe(4);
    expect(Object.keys(first).sort()).toEqual([
      'availability',
      'mediaType',
      'results',
      'source',
    ]);
  });

  it('uses multi-seed support as a boost while allowing a large quality gap to win', async () => {
    provider.findFavoriteSimilar.mockImplementation(
      async (_type: string, id: number) => ({
        ...response(id === 1 ? [title(10), title(20)] : [title(20)]),
        scores: new Map([
          [10, 0.9],
          [20, 0.2],
        ]),
      }),
    );

    expect(
      (await service.personalize(preferences)).results.map(({ id }) => id),
    ).toEqual([10, 20]);
  });

  it('preserves usable partial Similar results and marks a full fallback as degraded', async () => {
    provider.findFavoriteSimilar
      .mockResolvedValueOnce(response([title(10)], 'partial'))
      .mockRejectedValueOnce(new BadGatewayException())
      .mockResolvedValueOnce(response([title(11)]));
    provider.findRecommendationPool.mockResolvedValue(
      response(Array.from({ length: 20 }, (_, index) => title(index + 11))),
    );
    const result = await service.personalize(preferences);

    expect(result.results).toHaveLength(10);
    expect(result.results.slice(0, 2)).toEqual([title(10), title(11)]);
    expect(result.availability).toBe('partial');
  });

  it('uses degraded Popular when all seeds fail and retries seeds independently on the next request', async () => {
    provider.findFavoriteSimilar.mockRejectedValue(
      new GatewayTimeoutException(),
    );
    provider.findRecommendationPool.mockResolvedValue(response([title(10)]));

    expect(await service.personalize(preferences)).toMatchObject({
      source: 'popular',
      availability: 'partial',
      results: [title(10)],
    });

    provider.findFavoriteSimilar.mockResolvedValue(response([title(11)]));

    expect(await service.personalize(preferences)).toMatchObject({
      source: 'mixed',
      availability: 'available',
    });
    expect(provider.findFavoriteSimilar).toHaveBeenCalledTimes(6);
  });

  it('retains personalized results if Popular fails', async () => {
    provider.findFavoriteSimilar.mockResolvedValue(response([title(10)]));
    provider.findRecommendationPool.mockRejectedValue(
      new BadGatewayException(),
    );

    expect(await service.personalize(preferences)).toMatchObject({
      source: 'favorites',
      availability: 'partial',
      results: [title(10)],
    });
  });

  it.each([
    new BadGatewayException(),
    new GatewayTimeoutException(),
    new HttpException({ retryAfter: 30 }, 429),
  ])('preserves classified complete failures: %s', async (error) => {
    provider.findFavoriteSimilar.mockRejectedValue(error);
    provider.findRecommendationPool.mockRejectedValue(
      new BadGatewayException(),
    );

    await expect(service.personalize(preferences)).rejects.toBe(error);
  });

  it('does not hide a failed fallback behind successfully empty Similar sources', async () => {
    const error = new GatewayTimeoutException();
    provider.findRecommendationPool.mockRejectedValue(error);

    await expect(service.personalize(preferences)).rejects.toBe(error);
  });

  it('marks partial Popular responses even without seed failures', async () => {
    provider.findRecommendationPool.mockResolvedValue(
      response([title(10)], 'partial'),
    );

    expect(await service.personalize(preferences)).toMatchObject({
      availability: 'partial',
    });
  });

  it('starts at most three concurrent Similar calls and starts fallback only after they settle', async () => {
    const releases: Array<(value: RelatedTitlesResponse) => void> = [];
    provider.findFavoriteSimilar.mockImplementation(
      () => new Promise((resolve) => releases.push(resolve)),
    );
    const pending = service.personalize(preferences);

    expect(releases).toHaveLength(3);
    expect(provider.findRecommendationPool).not.toHaveBeenCalled();

    releases[2](response([title(12)]));
    releases[0](response([title(10)]));
    releases[1](response([title(11)]));
    const result = await pending;

    expect(result.results.map((item) => item.id)).toEqual([10, 11, 12]);
    expect(provider.findFavoriteSimilar).toHaveBeenCalledTimes(3);
    expect(provider.findRecommendationPool).toHaveBeenCalledTimes(1);
  });
});
