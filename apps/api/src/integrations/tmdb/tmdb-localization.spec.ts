import { localization } from '../../localization';
import { TmdbTransport } from './tmdb.transport';
import { TmdbDiscoveryProvider } from './tmdb-discovery.provider';
import { mapWatchProviders } from './tmdb-watch-providers.mapper';
import { TmdbMovieProvider } from './tmdb-movie.provider';

const config = {
  accessToken: 'test-token',
  apiBaseUrl: 'https://example.com/3',
  imageBaseUrl: 'https://example.com/images',
  language: 'en-US',
};

describe('request localization', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();
  const transport = new TmdbTransport(config, { warn: jest.fn() });

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it.each(['en-US', 'hu-HU'] as const)(
    'propagates %s without coupling the region',
    async (language) => {
      fetchMock.mockResolvedValue(Response.json({ results: [] }));
      await localization.run({ language, region: 'HU' }, () =>
        transport.request({
          path: '/search/movie',
          operation: 'search',
          validateBody: () => undefined,
        }),
      );

      expect(fetchMock.mock.calls[0][0].searchParams.get('language')).toBe(
        language,
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it('falls back once for empty Hungarian overview and preserves translated fields', async () => {
    fetchMock
      .mockResolvedValueOnce(
        Response.json({ id: 1, title: 'Magyar cím', overview: '' }),
      )
      .mockResolvedValueOnce(
        Response.json({
          id: 1,
          title: 'English title',
          overview: 'English overview',
        }),
      );
    const result = await localization.run(
      { language: 'hu-HU', region: 'US' },
      () =>
        transport.request({
          path: '/movie/1',
          operation: 'details',
          validateBody: () => undefined,
        }),
    );

    expect(result).toEqual({
      id: 1,
      title: 'Magyar cím',
      overview: 'English overview',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0].searchParams.get('language')).toBe(
      'en-US',
    );
  });

  it('makes no fallback request for a valid translation or list rows', async () => {
    fetchMock
      .mockResolvedValueOnce(
        Response.json({ id: 1, overview: 'Magyar ismertető' }),
      )
      .mockResolvedValueOnce(
        Response.json({ results: [{ id: 2, overview: '' }] }),
      );
    await localization.run({ language: 'hu-HU', region: 'HU' }, async () => {
      await transport.request({
        path: '/movie/1',
        operation: 'details',
        validateBody: () => undefined,
      });
      await transport.request({
        path: '/search/movie',
        operation: 'search',
        validateBody: () => undefined,
      });
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps language-neutral images and English images in Hungarian galleries', async () => {
    fetchMock.mockResolvedValue(Response.json({ backdrops: [], posters: [] }));
    await localization.run({ language: 'hu-HU', region: 'US' }, () =>
      transport.request({
        path: '/movie/1/images',
        operation: 'images',
        validateBody: () => undefined,
      }),
    );

    expect(
      fetchMock.mock.calls[0][0].searchParams.get('include_image_language'),
    ).toBe('hu,en,null');
  });

  it('isolates discovery caches and concurrent requests by locale', async () => {
    fetchMock.mockImplementation((url: URL) =>
      Promise.resolve(
        Response.json({
          page: 1,
          total_pages: 1,
          total_results: 1,
          results: [
            {
              id: 1,
              title: url.searchParams.get('language'),
              poster_path: '/poster.jpg',
            },
          ],
        }),
      ),
    );
    const provider = new TmdbDiscoveryProvider(config);

    const [english, hungarian] = await Promise.all([
      localization.run({ language: 'en-US', region: 'US' }, () =>
        provider.find('popular-movies'),
      ),
      localization.run({ language: 'hu-HU', region: 'US' }, () =>
        provider.find('popular-movies'),
      ),
    ]);
    expect(english.results[0]).toMatchObject({ title: 'en-US' });
    expect(hungarian.results[0]).toMatchObject({ title: 'hu-HU' });

    await localization.run({ language: 'en-US', region: 'US' }, () =>
      provider.find('popular-movies'),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('selects the independent streaming market', () => {
    const body = {
      results: {
        HU: { flatrate: [{ provider_id: 1, provider_name: 'HU provider' }] },
        US: { flatrate: [{ provider_id: 2, provider_name: 'US provider' }] },
      },
    };
    const result = localization.run({ language: 'hu-HU', region: 'US' }, () =>
      mapWatchProviders(body, config.imageBaseUrl),
    );

    expect(result.providers).toEqual([
      expect.objectContaining({ id: 2, region: 'US' }),
    ]);
  });

  it('localizes genre labels while resolving stable English filter identifiers', async () => {
    fetchMock.mockImplementation((url: URL) => {
      const body = url.pathname.endsWith('/genre/movie/list')
        ? {
            genres: [
              {
                id: 28,
                name:
                  url.searchParams.get('language') === 'hu-HU'
                    ? 'Akció'
                    : 'Action',
              },
            ],
          }
        : {
            page: 1,
            total_pages: 1,
            total_results: 1,
            results: [
              {
                id: 1,
                title: 'Magyar film',
                release_date: '2020-01-01',
                poster_path: '/poster.jpg',
                genre_ids: [28],
                vote_average: 7,
              },
            ],
          };

      return Promise.resolve(Response.json(body));
    });
    const provider = new TmdbMovieProvider(config);
    const response = await localization.run(
      { language: 'hu-HU', region: 'US' },
      () => provider.findAll({ genre: 'action' }),
    );

    expect(response.movies[0].genres).toEqual(['Akció']);
    expect(
      fetchMock.mock.calls.some(
        ([url]: [URL]) => url.searchParams.get('with_genres') === '28',
      ),
    ).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('fills missing season episode copy by identity with one fallback request', async () => {
    fetchMock
      .mockResolvedValueOnce(
        Response.json({
          id: 1,
          overview: 'Magyar évad',
          episodes: [{ id: 2, name: 'Magyar epizód', overview: '' }],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          id: 1,
          overview: 'English season',
          episodes: [
            { id: 2, name: 'English episode', overview: 'English overview' },
          ],
        }),
      );
    const response = await localization.run(
      { language: 'hu-HU', region: 'US' },
      () =>
        transport.request({
          path: '/tv/1/season/1',
          operation: 'season',
          validateBody: () => undefined,
        }),
    );

    expect(response).toEqual({
      id: 1,
      overview: 'Magyar évad',
      episodes: [
        { id: 2, name: 'Magyar epizód', overview: 'English overview' },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
