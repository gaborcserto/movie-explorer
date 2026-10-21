import { BadGatewayException, GatewayTimeoutException } from '@nestjs/common';
import { TmdbSearchProvider } from './tmdb-search.provider';
import { mapSearch } from './tmdb-search.mapper';

const config = {
  accessToken: 'test-token',
  apiBaseUrl: 'https://example.test/3',
  imageBaseUrl: 'https://image.test/w500',
  language: 'en-US',
  requestTimeoutMs: 20,
};
const page = (results: unknown[], current = 1) => ({
  results,
  page: current,
  total_pages: 900,
  total_results: 18000,
});

describe('unified search', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();
  const provider = new TmdbSearchProvider(config);
  beforeEach(() => {
    global.fetch = fetchMock;
    fetchMock.mockReset();
  });
  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it.each(['all', 'movie', 'tv', 'person'] as const)(
    'uses one matching upstream request for %s and keeps page boundaries',
    async (type) => {
      fetchMock.mockResolvedValue(Response.json(page([], 500)));
      await expect(provider.find(' Query ', type, 500)).resolves.toEqual({
        results: [],
        page: 500,
        totalPages: 500,
        totalResults: 18000,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const url: URL = fetchMock.mock.calls[0][0];
      expect(url.pathname).toBe(`/3/search/${type === 'all' ? 'multi' : type}`);
      expect(Object.fromEntries(url.searchParams)).toEqual({
        language: 'en-US',
        query: 'Query',
        page: '500',
        include_adult: 'false',
      });
    },
  );

  it.each(['movie', 'tv'] as const)(
    'maps the %s year to its provider parameter',
    async (type) => {
      fetchMock.mockResolvedValue(Response.json(page([])));
      await provider.find('Query', type, 1, 2005);
      const url: URL = fetchMock.mock.calls[0][0];
      expect(
        url.searchParams.get(
          type === 'tv' ? 'first_air_date_year' : 'primary_release_year',
        ),
      ).toBe('2005');
      expect(url.searchParams.has('year')).toBe(false);
    },
  );

  it('preserves mixed ordering and composite identities, omits absent metadata, and drops duplicates and unusable records', () => {
    const response = mapSearch(
      page([
        {
          id: 1,
          media_type: 'tv',
          name: 'Series',
          first_air_date: '2005-02-21',
          poster_path: '/series.jpg',
          vote_average: 8,
          popularity: 12,
          overview: 'Overview',
        },
        { id: 1, media_type: 'movie', title: 'Movie' },
        { id: 1, media_type: 'person', name: 'Person' },
        { id: 1, media_type: 'tv', name: 'Duplicate' },
        { id: 2, media_type: 'movie', title: 'Adult', adult: true },
        { id: -1, media_type: 'tv', name: 'Invalid' },
        { id: 3, media_type: 'unknown', name: 'Other' },
        null,
      ]),
      'all',
      config.imageBaseUrl,
    );
    expect(
      response.results.map((item) => `${item.mediaType}:${item.id}`),
    ).toEqual(['tv:1', 'movie:1', 'person:1']);
    expect(response.results[0]).toMatchObject({
      title: 'Series',
      firstAirDate: '2005-02-21',
      posterUrl: 'https://image.test/w500/series.jpg',
      rating: 8,
      popularity: 12,
      description: 'Overview',
    });
    expect(JSON.parse(JSON.stringify(response.results[1]))).toEqual({
      id: 1,
      mediaType: 'movie',
      title: 'Movie',
    });
  });

  it.each(['movie', 'tv', 'person'] as const)(
    'maps %s without a multi-search discriminator',
    (type) => {
      const response = mapSearch(
        page([
          {
            id: 1,
            title: 'Movie',
            name: 'Name',
            first_air_date: null,
            poster_path: null,
          },
        ]),
        type,
        config.imageBaseUrl,
      );
      expect(response.results).toHaveLength(1);
      expect(response.results[0].mediaType).toBe(type);
    },
  );

  it.each(['network', 'json', 'shape', 'wrong-page', 'http'])(
    'sanitizes %s failures',
    async (kind) => {
      if (kind === 'network') fetchMock.mockRejectedValue(new Error('secret'));
      else if (kind === 'http')
        fetchMock.mockResolvedValue(new Response('secret', { status: 401 }));
      else if (kind === 'json')
        fetchMock.mockResolvedValue(new Response('secret'));
      else
        fetchMock.mockResolvedValue(
          Response.json(kind === 'shape' ? {} : page([], 2)),
        );
      await expect(provider.find('Query', 'all', 1)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    },
  );

  it('preserves rate limiting', async () => {
    fetchMock.mockResolvedValue(
      new Response('', { status: 429, headers: { 'Retry-After': '10' } }),
    );
    await expect(provider.find('Query', 'tv', 1)).rejects.toMatchObject({
      status: 429,
      response: expect.objectContaining({ retryAfter: 10 }),
    });
  });

  it('omits invalid dates and optional metadata without fabricating replacements', () => {
    const response = mapSearch(
      page([
        {
          id: 1,
          name: 'Series',
          first_air_date: '2005-02-31',
          overview: null,
          poster_path: 'invalid',
          vote_average: -1,
          popularity: 'popular',
        },
      ]),
      'tv',
      config.imageBaseUrl,
    );
    expect(JSON.parse(JSON.stringify(response.results))).toEqual([
      { id: 1, mediaType: 'tv', title: 'Series' },
    ]);
  });

  it('aborts timed out requests and clears the timer', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: URL, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener(
            'abort',
            () => reject(new Error('aborted')),
            { once: true },
          );
        }),
    );
    const pending = expect(
      provider.find('Query', 'all', 1),
    ).rejects.toBeInstanceOf(GatewayTimeoutException);
    await jest.advanceTimersByTimeAsync(20);
    await pending;
    expect(jest.getTimerCount()).toBe(0);
  });
});
