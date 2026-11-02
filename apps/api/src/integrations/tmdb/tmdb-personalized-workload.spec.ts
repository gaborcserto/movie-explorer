import { Logger } from '@nestjs/common';

import { RecommendationsService } from '../../recommendations/recommendations.service';
import { TmdbDiscoveryProvider } from './tmdb-discovery.provider';

// Exercise service, transport, mapping and pool sharing together without TMDB.
describe('deployment recommendation workload budgets', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();
  const config = {
    accessToken: 'offline-placeholder',
    apiBaseUrl: 'https://provider.invalid/3',
    imageBaseUrl: 'https://images.invalid/w500',
    language: 'en-US',
    requestTimeoutMs: 8000,
  };
  let active: number;
  let peak: number;
  let mode: 'available' | 'empty' | 'partial' | 'outage';

  beforeEach(() => {
    jest.useFakeTimers();
    active = 0;
    peak = 0;
    mode = 'available';
    fetchMock.mockReset();
    global.fetch = fetchMock;
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    fetchMock.mockImplementation(async (url: URL) => {
      active += 1;
      peak = Math.max(peak, active);
      const similar = url.pathname.endsWith('/similar');
      const page = Number(url.searchParams.get('page'));

      // Just under each transport deadline: 6s seeds, then two 8s pool rounds.
      await new Promise((resolve) =>
        setTimeout(resolve, similar ? 5990 : 7990),
      );
      active -= 1;

      if (mode === 'outage' || (mode === 'partial' && page === 3)) {
        return new Response(null, { status: 503 });
      }

      const results =
        similar || mode === 'empty'
          ? []
          : Array.from({ length: 20 }, (_, index) => ({
              id: page * 100 + index,
              title: 'Movie',
              name: 'Series',
              poster_path: '/poster.jpg',
            }));

      return Response.json({
        page,
        total_pages: 5,
        total_results: results.length ? 100 : 0,
        results,
      });
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each([
    ['movie', []],
    ['movie', [1]],
    ['movie', [1, 2, 3]],
    ['tv', [1, 2, 3]],
  ] as const)(
    'bounds cold and warm fallback for %s seeds %j',
    async (mediaType, seeds) => {
      const service = new RecommendationsService(
        new TmdbDiscoveryProvider(config),
      );
      const preferences = {
        mediaType,
        favoriteIds: [...seeds],
        excludedIds: [],
      };
      const started = Date.now();
      const pending = service.personalize(preferences);
      await jest.runAllTimersAsync();
      const result = await pending;

      expect(result.results).toHaveLength(10);
      expect(
        result.results.every((title) => title.mediaType === mediaType),
      ).toBe(true);
      expect(result.source).toBe('popular');
      expect(fetchMock).toHaveBeenCalledTimes(seeds.length + 5);
      expect(peak).toBe(4);
      expect(Date.now() - started).toBe(seeds.length ? 21970 : 15980);

      const warm = service.personalize(preferences);
      await jest.runAllTimersAsync();
      expect((await warm).results).toHaveLength(10);
      expect(fetchMock).toHaveBeenCalledTimes(seeds.length * 2 + 5);
    },
  );

  it('shares a cold Popular pool across concurrent personalized requests', async () => {
    const service = new RecommendationsService(
      new TmdbDiscoveryProvider(config),
    );
    const pending = Promise.all(
      [1, 2].map(() =>
        service.personalize({
          mediaType: 'movie',
          favoriteIds: [1, 2, 3],
          excludedIds: [],
        }),
      ),
    );
    await jest.runAllTimersAsync();

    expect(
      (await pending).every((result) => result.results.length === 10),
    ).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(6 + 5);
    // Similar limits are per request, not a process-wide semaphore.
    expect(peak).toBe(6);
  });

  it('isolates Movie and Series pools for concurrent mixed-library requests', async () => {
    const service = new RecommendationsService(
      new TmdbDiscoveryProvider(config),
    );
    const pending = Promise.all(
      (['movie', 'tv'] as const).map((mediaType) =>
        service.personalize({ mediaType, favoriteIds: [1], excludedIds: [] }),
      ),
    );
    await jest.runAllTimersAsync();
    const results = await pending;

    expect(fetchMock).toHaveBeenCalledTimes(12);
    expect(
      results[0].results.every((title) => title.mediaType === 'movie'),
    ).toBe(true);
    expect(results[1].results.every((title) => title.mediaType === 'tv')).toBe(
      true,
    );
  });

  it('returns honest empty and partial results and recovers without retaining degradation', async () => {
    const service = new RecommendationsService(
      new TmdbDiscoveryProvider(config),
    );
    const preferences = {
      mediaType: 'movie' as const,
      favoriteIds: [1],
      excludedIds: [],
    };
    mode = 'partial';
    const partial = service.personalize(preferences);
    await jest.runAllTimersAsync();
    expect(await partial).toMatchObject({
      availability: 'partial',
      source: 'popular',
    });

    mode = 'available';
    const recovered = service.personalize(preferences);
    await jest.runAllTimersAsync();
    expect(await recovered).toMatchObject({ availability: 'available' });
    expect(fetchMock).toHaveBeenCalledTimes(12);

    mode = 'empty';
    const emptyService = new RecommendationsService(
      new TmdbDiscoveryProvider(config),
    );
    const empty = emptyService.personalize(preferences);
    await jest.runAllTimersAsync();
    expect(await empty).toMatchObject({
      results: [],
      availability: 'available',
    });
  });

  it('preserves a sanitized complete-outage error without retries', async () => {
    mode = 'outage';
    const service = new RecommendationsService(
      new TmdbDiscoveryProvider(config),
    );
    const pending = service.personalize({
      mediaType: 'movie',
      favoriteIds: [1, 2, 3],
      excludedIds: [],
    });
    const assertion = expect(pending).rejects.toMatchObject({
      status: 502,
      message: 'Movie provider request failed',
    });
    await jest.runAllTimersAsync();
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(peak).toBe(3);
  });
});
