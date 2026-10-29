import { Logger } from '@nestjs/common';

import { TmdbDiscoveryProvider } from './tmdb-discovery.provider';

const config = {
  accessToken: 'test-token',
  apiBaseUrl: 'https://api.example/3',
  imageBaseUrl: 'https://images.example/w500',
  language: 'hu-HU',
  region: 'HU',
  requestTimeoutMs: 50,
};

describe('TmdbDiscoveryProvider', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();
  let provider: TmdbDiscoveryProvider;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    provider = new TmdbDiscoveryProvider(config);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('maps trending movie and series records with backdrop URLs and caches the feed', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        page: 1,
        total_pages: 1,
        total_results: 2,
        results: [
          {
            id: 4,
            media_type: 'movie',
            title: 'Film',
            release_date: '2025-03-01',
            overview: 'Overview',
            poster_path: '/poster.jpg',
            backdrop_path: '/backdrop.jpg',
            vote_average: 8.1,
          },
          {
            id: 5,
            media_type: 'tv',
            name: 'Series',
            first_air_date: '2024-02-01',
            backdrop_path: '/series-backdrop.jpg',
          },
        ],
      }),
    );

    const first = await provider.find('trending');
    const second = await provider.find('trending');

    expect(first.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 4,
          mediaType: 'movie',
          backdropUrl: 'https://images.example/w1280/backdrop.jpg',
        }),
        expect.objectContaining({
          id: 5,
          mediaType: 'tv',
          backdropUrl: 'https://images.example/w1280/series-backdrop.jpg',
        }),
      ]),
    );
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe(
      '/3/trending/all/week',
    );
  });

  it('requests the requested discovery page and keeps page caches separate', async () => {
    fetchMock.mockImplementation((url: string) => {
      const page = Number(new URL(url).searchParams.get('page'));

      return Promise.resolve(
        Response.json({
          page,
          total_pages: 2,
          total_results: 0,
          results: [],
        }),
      );
    });

    await provider.find('popular-movies', 1);
    const secondPage = await provider.find('popular-movies', 2);
    await provider.find('popular-movies', 2);

    expect(secondPage.page).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      fetchMock.mock.calls.map(([url]) =>
        new URL(url).searchParams.get('page'),
      ),
    ).toEqual(['1', '2']);
  });

  it('resolves providers from both regional catalogs and discovers mixed media', async () => {
    fetchMock.mockImplementation((url: string) => {
      const requestUrl = new URL(url);

      if (requestUrl.pathname.endsWith('/watch/providers/movie')) {
        return Promise.resolve(
          Response.json({
            results: [
              { provider_id: 8, provider_name: 'Netflix' },
              { provider_id: 9, provider_name: 'Movie Provider' },
            ],
          }),
        );
      }
      if (requestUrl.pathname.endsWith('/watch/providers/tv')) {
        return Promise.resolve(
          Response.json({
            results: [
              { provider_id: 8, provider_name: 'Netflix' },
              { provider_id: 10, provider_name: 'TV Provider' },
            ],
          }),
        );
      }

      const isMovie = requestUrl.pathname.endsWith('/discover/movie');

      return Promise.resolve(
        Response.json({
          page: 1,
          total_pages: 1,
          total_results: 1,
          results: [
            isMovie
              ? { id: 1, title: 'Movie', release_date: '2025-01-01' }
              : { id: 2, name: 'Series', first_air_date: '2025-01-01' },
          ],
        }),
      );
    });

    const providers = await provider.findStreamingProviders('HU');
    const results = await provider.findStreaming(8, 'HU', 1);

    expect(providers).toEqual([
      { id: 9, name: 'Movie Provider' },
      { id: 8, name: 'Netflix' },
      { id: 10, name: 'TV Provider' },
    ]);
    expect(results.results.map((item) => item.mediaType)).toEqual([
      'movie',
      'tv',
    ]);
    const discoveryCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes('/discover/'),
    );

    expect(discoveryCalls).toHaveLength(2);
    discoveryCalls.forEach(([url]) => {
      const requestUrl = new URL(url);
      expect(requestUrl.searchParams.get('watch_region')).toBe('HU');
      expect(requestUrl.searchParams.get('with_watch_providers')).toBe('8');
      expect(requestUrl.searchParams.get('with_watch_monetization_types')).toBe(
        'flatrate',
      );
    });
  });

  it('rejects provider IDs absent from the selected region catalog', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        Response.json({
          results: [{ provider_id: 8, provider_name: 'Netflix' }],
        }),
      ),
    );

    await expect(provider.findStreaming(999, 'HU', 1)).rejects.toMatchObject({
      status: 400,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('uses a bounded recent release window and Hungarian theatrical release filters', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        page: 1,
        total_pages: 1,
        total_results: 0,
        results: [],
      }),
    );

    await provider.find('new-movies');

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('region')).toBe('HU');
    expect(url.searchParams.get('with_release_type')).toBe('2|3');
    expect(url.searchParams.get('release_date.gte')).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
    expect(url.searchParams.get('release_date.lte')).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
    expect(url.searchParams.get('sort_by')).toBe('release_date.desc');
  });

  it.each([
    ['streaming-movies', '/3/discover/movie'],
    ['streaming-series', '/3/discover/tv'],
  ] as const)(
    'filters %s to subscription streaming available in Hungary',
    async (section, path) => {
      fetchMock.mockResolvedValue(
        Response.json({
          page: 1,
          total_pages: 1,
          total_results: 0,
          results: [],
        }),
      );

      await provider.find(section);

      const url = new URL(fetchMock.mock.calls[0][0]);
      expect(url.pathname).toBe(path);
      expect(url.searchParams.get('watch_region')).toBe('HU');
      expect(url.searchParams.get('with_watch_monetization_types')).toBe(
        'flatrate',
      );
      expect(url.searchParams.get('sort_by')).toBe('popularity.desc');
    },
  );

  it('combines upcoming movie and series premieres in date order', async () => {
    fetchMock
      .mockResolvedValueOnce(
        Response.json({
          page: 1,
          total_pages: 1,
          total_results: 1,
          results: [
            { id: 10, title: 'Upcoming Movie', release_date: '2026-12-01' },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          page: 1,
          total_pages: 1,
          total_results: 1,
          results: [
            { id: 11, name: 'Upcoming Series', first_air_date: '2026-11-01' },
          ],
        }),
      );

    const result = await provider.find('coming-soon');

    expect(result.results.map((item) => item.mediaType)).toEqual([
      'tv',
      'movie',
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      fetchMock.mock.calls.map(([request]) => new URL(request).pathname),
    ).toEqual(['/3/discover/movie', '/3/discover/tv']);
  });
});
