import { HttpException, Logger } from '@nestjs/common';

import { TmdbDiscoveryProvider } from './tmdb-discovery.provider';

import type { RecommendationCategory } from '@movie-explorer/contracts';

const config = {
  accessToken: 'test-token',
  apiBaseUrl: 'https://api.example/3',
  imageBaseUrl: 'https://images.example/w500',
  language: 'hu-HU',
  region: 'HU',
  requestTimeoutMs: 50,
};

function row(id: number) {
  return {
    id,
    title: `Movie ${id}`,
    name: `Series ${id}`,
    poster_path: '/poster.jpg',
    backdrop_path: '/backdrop.jpg',
    release_date: '2025-03-01',
    first_air_date: '2024-02-01',
    vote_average: 8,
    vote_count: 100,
  };
}

function page(number = 1, totalPages = 5, results: unknown[] = [row(number)]) {
  return { page: number, total_pages: totalPages, total_results: 100, results };
}

describe('TMDB recommendation pools through DiscoveryProvider', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();
  let provider: TmdbDiscoveryProvider;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    provider = new TmdbDiscoveryProvider(config);
    fetchMock.mockImplementation((url: URL) => {
      const number = Number(url.searchParams.get('page'));

      return Promise.resolve(Response.json(page(number)));
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it.each<[RecommendationCategory, string, string]>([
    ['popular-movies', '/movie/popular', 'movie'],
    ['top-rated-movies', '/movie/top_rated', 'movie'],
    ['popular-series', '/tv/popular', 'tv'],
    ['top-rated-series', '/tv/top_rated', 'tv'],
  ])(
    'routes %s, maps titles and retains locale',
    async (category, path, type) => {
      const pool = await provider.findRecommendationPool(category);

      expect(fetchMock).toHaveBeenCalledTimes(5);
      expect(pool.availability).toBe('available');
      expect(pool.results.map((title) => title.id)).toEqual([1, 2, 3, 4, 5]);
      expect(pool.results[0]).toMatchObject({
        id: 1,
        mediaType: type,
        title: type === 'movie' ? 'Movie 1' : 'Series 1',
        posterUrl: 'https://images.example/w500/poster.jpg',
        backdropUrl: 'https://images.example/w1280/backdrop.jpg',
        rating: 8,
        ...(type === 'movie'
          ? { releaseDate: '2025-03-01', releaseYear: 2025 }
          : { firstAirDate: '2024-02-01' }),
      });

      fetchMock.mock.calls.forEach(([url]: [URL]) => {
        expect(url.pathname).toBe(`/3${path}`);
        expect(url.searchParams.get('language')).toBe('hu-HU');
        expect(url.searchParams.get('region')).toBe('HU');
      });
    },
  );

  it.each([0, 1, 2, 4, 5, 500])(
    'only retrieves available pages up to five (totalPages=%i)',
    async (totalPages) => {
      fetchMock.mockImplementation((url: URL) =>
        Promise.resolve(
          Response.json(
            page(Number(url.searchParams.get('page')), totalPages, []),
          ),
        ),
      );

      expect(await provider.findRecommendationPool('popular-movies')).toEqual({
        availability: 'available',
        results: [],
        signals: new Map(),
      });
      expect(fetchMock).toHaveBeenCalledTimes(
        Math.max(1, Math.min(5, totalPages)),
      );
    },
  );

  it('builds a ranked pool of 100, shares concurrent loads and caches only the pool', async () => {
    fetchMock.mockImplementation((url: URL) => {
      const number = Number(url.searchParams.get('page'));

      return Promise.resolve(
        Response.json(
          page(
            number,
            20,
            Array.from({ length: 20 }, (_, index) =>
              row((number - 1) * 20 + index + 1),
            ),
          ),
        ),
      );
    });
    const [first, concurrent] = await Promise.all([
      provider.findRecommendationPool('popular-movies'),
      provider.findRecommendationPool('popular-movies'),
    ]);
    const hit = await provider.findRecommendationPool('popular-movies');

    expect(first).toBe(concurrent);
    expect(hit).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(first.results.map((title) => title.id)).toEqual(
      Array.from({ length: 100 }, (_, index) => index + 1),
    );
  });

  it('caps candidates at 100 even if upstream page sizes increase', async () => {
    fetchMock.mockImplementation((url: URL) => {
      const number = Number(url.searchParams.get('page'));

      return Promise.resolve(
        Response.json(
          page(
            number,
            5,
            Array.from({ length: 30 }, (_, index) =>
              row((number - 1) * 30 + index + 1),
            ),
          ),
        ),
      );
    });
    const pool = await provider.findRecommendationPool('popular-movies');

    expect(pool.results.map((title) => title.id)).toEqual(
      Array.from({ length: 100 }, (_, index) => index + 1),
    );
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('deduplicates across pages, skips malformed rows and keeps first-ranked metadata', async () => {
    fetchMock.mockImplementation((url: URL) => {
      const number = Number(url.searchParams.get('page'));
      const results =
        number === 1
          ? [row(7), null, { id: 0, title: 'Invalid' }, { id: 8, title: ' ' }]
          : [
              { ...row(7), title: 'Duplicate' },
              { id: -1, title: 'Invalid' },
              { ...row(8), media_type: 'person' },
              { ...row(9), adult: true },
              { ...row(10), id: 1.5 },
              { id: 11, title: 'No poster or date' },
              row(12),
            ];

      return Promise.resolve(Response.json(page(number, 2, results)));
    });
    const pool = await provider.findRecommendationPool('popular-movies');

    expect(pool.results.map((title) => title.id)).toEqual([7, 11, 12]);
    expect(pool.results[0].title).toBe('Movie 7');
    expect(pool.results[1].posterUrl).toBeUndefined();
  });

  it('waits for page one then overlaps at most four pages without changing rank order', async () => {
    const complete = new Map<number, () => void>();
    fetchMock.mockImplementation(
      (url: URL) =>
        new Promise<Response>((resolve) => {
          const number = Number(url.searchParams.get('page'));
          complete.set(number, () => resolve(Response.json(page(number))));
        }),
    );
    const pending = provider.findRecommendationPool('popular-movies');

    expect([...complete.keys()]).toEqual([1]);

    complete.get(1)?.();
    // Advance transport JSON parsing and the next bounded request batch.
    await new Promise((resolve) => setImmediate(resolve));

    expect([...complete.keys()]).toEqual([1, 2, 3, 4, 5]);

    [5, 3, 4, 2].forEach((number) => complete.get(number)?.());

    expect((await pending).results.map((title) => title.id)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it('expires at 30 minutes and deduplicates expiry refetches', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
    const first = await provider.findRecommendationPool('popular-movies');
    now.mockReturnValue(1000 + 30 * 60 * 1000 - 1);

    expect(await provider.findRecommendationPool('popular-movies')).toBe(first);

    now.mockReturnValue(1000 + 30 * 60 * 1000);
    const [next, concurrent] = await Promise.all([
      provider.findRecommendationPool('popular-movies'),
      provider.findRecommendationPool('popular-movies'),
    ]);

    expect(next).not.toBe(first);
    expect(next).toBe(concurrent);
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it('isolates all four categories, bounds retention and removes expired unused pools', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
    const categories: RecommendationCategory[] = [
      'popular-movies',
      'top-rated-movies',
      'popular-series',
      'top-rated-series',
    ];
    const pools = await Promise.all(
      categories.map((category) => provider.findRecommendationPool(category)),
    );

    for (let index = 0; index < categories.length; index += 1) {
      expect(await provider.findRecommendationPool(categories[index])).toBe(
        pools[index],
      );
    }

    expect(fetchMock).toHaveBeenCalledTimes(20);
    expect(provider['recommendationPools']['cache'].size).toBe(4);

    now.mockReturnValue(1000 + 30 * 60 * 1000);
    await provider.findRecommendationPool('popular-movies');

    expect(provider['recommendationPools']['cache'].size).toBe(1);
    expect(provider['recommendationPools']['requests'].size).toBe(0);
  });

  it('isolates fixed locale/region instances and cold starts', async () => {
    const other = new TmdbDiscoveryProvider({
      ...config,
      language: 'en-US',
      region: undefined,
    });
    const first = await provider.findRecommendationPool('popular-movies');
    const second = await other.findRecommendationPool('popular-movies');
    const cold = new TmdbDiscoveryProvider(config);
    await cold.findRecommendationPool('popular-movies');

    expect(first).not.toBe(second);
    expect(fetchMock).toHaveBeenCalledTimes(15);
    expect(fetchMock.mock.calls[5][0].searchParams.get('language')).toBe(
      'en-US',
    );
    expect(fetchMock.mock.calls[5][0].searchParams.has('region')).toBe(false);
  });

  it.each([1, 3, 4])(
    'returns explicitly partial pools for %i failed later pages and retries next time',
    async (failedPages) => {
      fetchMock.mockImplementation((url: URL) => {
        const number = Number(url.searchParams.get('page'));

        return Promise.resolve(
          number > 1 && number <= failedPages + 1
            ? new Response(null, { status: 503 })
            : Response.json(page(number)),
        );
      });
      const [first, waiter] = await Promise.all([
        provider.findRecommendationPool('popular-movies'),
        provider.findRecommendationPool('popular-movies'),
      ]);

      expect(first).toBe(waiter);
      expect(first.availability).toBe('partial');
      expect(first.results).toHaveLength(5 - failedPages);

      await provider.findRecommendationPool('popular-movies');

      expect(fetchMock).toHaveBeenCalledTimes(10);
    },
  );

  it('does not hide later failure behind a successful empty page', async () => {
    fetchMock.mockResolvedValueOnce(Response.json(page(1, 2, [])));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));

    await expect(
      provider.findRecommendationPool('popular-movies'),
    ).rejects.toMatchObject({ status: 502 });
  });

  it.each([404, 429, 500, 503])(
    'preserves first-page error classification for upstream %i and allows retry',
    async (status) => {
      fetchMock.mockResolvedValueOnce(
        new Response(null, { status, headers: { 'Retry-After': '30' } }),
      );
      const requests = await Promise.allSettled([
        provider.findRecommendationPool('popular-movies'),
        provider.findRecommendationPool('popular-movies'),
      ]);

      expect(fetchMock).toHaveBeenCalledTimes(1);

      requests.forEach((result) => {
        expect(result.status).toBe('rejected');

        if (result.status === 'rejected') {
          expect(result.reason).toBeInstanceOf(HttpException);
          expect(result.reason.getStatus()).toBe(status === 429 ? 429 : 502);

          if (status === 429) {
            expect(result.reason.getResponse()).toMatchObject({
              retryAfter: 30,
            });
          }
        }
      });

      expect(
        (await provider.findRecommendationPool('popular-movies')).availability,
      ).toBe('available');
      expect(fetchMock).toHaveBeenCalledTimes(6);
    },
  );

  it.each([
    null,
    {},
    { ...page(), page: 2 },
    { ...page(), total_pages: -1 },
    { ...page(), results: 'invalid' },
    page(1, 0),
  ])('rejects malformed page envelopes (%j)', async (payload) => {
    fetchMock.mockResolvedValueOnce(Response.json(payload));

    await expect(
      provider.findRecommendationPool('popular-movies'),
    ).rejects.toMatchObject({ status: 502 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('treats invalid later payloads as partial and retains sanitized transport logging', async () => {
    fetchMock.mockResolvedValueOnce(Response.json(page(1, 2)));
    fetchMock.mockResolvedValueOnce(Response.json({ invalid: 'test-token' }));
    const pool = await provider.findRecommendationPool('popular-movies');

    expect(pool.availability).toBe('partial');
    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'recommendations-popular-movies',
        failure: 'invalid-response',
        applicationStatus: 502,
      }),
    );
    expect(
      JSON.stringify(jest.mocked(Logger.prototype.warn).mock.calls),
    ).not.toContain('test-token');
  });

  it('preserves timeout classification, clears pending loads and recovers', async () => {
    fetchMock.mockImplementationOnce(
      (_url: URL, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    );

    await expect(
      provider.findRecommendationPool('popular-movies'),
    ).rejects.toMatchObject({ status: 504 });
    expect(provider['recommendationPools']['requests'].size).toBe(0);
    expect(
      (await provider.findRecommendationPool('popular-movies')).availability,
    ).toBe('available');
  });
});
