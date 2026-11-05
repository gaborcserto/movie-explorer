import { GatewayTimeoutException, Logger } from '@nestjs/common';

import { TmdbDiscoveryProvider } from './tmdb-discovery.provider';

const config = {
  accessToken: 'isolated-test-token',
  apiBaseUrl: 'https://api.example/3',
  imageBaseUrl: 'https://images.example',
  language: 'hu-HU',
  requestTimeoutMs: 8000,
};

describe('Favorite Similar integration', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
    fetchMock.mockReset();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each(['movie', 'tv'] as const)(
    'reuses first-page %s Similar mapping without credentials or raw provider models',
    async (mediaType) => {
      fetchMock.mockResolvedValue(
        Response.json({
          page: 1,
          total_pages: 5,
          total_results: 100,
          results: [
            {
              id: 2,
              title: 'Movie',
              name: 'Series',
              poster_path: '/poster.jpg',
            },
            { id: 3, title: 'No poster', name: 'No poster' },
            { id: -1, title: 'Invalid', name: 'Invalid' },
          ],
        }),
      );

      const result = await new TmdbDiscoveryProvider(
        config,
      ).findFavoriteSimilar(mediaType, 1);

      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url] = fetchMock.mock.calls[0];

      expect(url.pathname).toBe(`/3/${mediaType}/1/similar`);
      expect(url.searchParams.get('page')).toBe('1');
      expect(url.searchParams.get('language')).toBe('hu-HU');
      expect(result.availability).toBe('partial');
      expect(result.results[0]).toMatchObject({
        id: 2,
        mediaType,
        posterUrl: 'https://images.example/poster.jpg',
      });
      expect(JSON.stringify(result)).not.toContain(config.accessToken);
      expect(JSON.stringify(result)).not.toContain('poster_path');
    },
  );

  it.each([8000, 30])(
    'caps the seed timeout at the lower of six seconds and configured %s ms, without retry',
    async (requestTimeoutMs) => {
      jest.useFakeTimers();
      fetchMock.mockImplementation(
        (_url, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener(
              'abort',
              () => reject(new Error('aborted')),
              { once: true },
            );
          }),
      );
      const provider = new TmdbDiscoveryProvider({
        ...config,
        requestTimeoutMs,
      });
      const pending = provider.findFavoriteSimilar('movie', 123);
      const assertion = expect(pending).rejects.toBeInstanceOf(
        GatewayTimeoutException,
      );
      await jest.advanceTimersByTimeAsync(Math.min(6000, requestTimeoutMs));
      await assertion;

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(Logger.prototype.warn).toHaveBeenCalledWith({
        operation: 'movie-similar',
        failure: 'timeout',
        applicationStatus: 504,
        upstreamStatus: undefined,
      });
      expect(
        JSON.stringify(jest.mocked(Logger.prototype.warn).mock.calls),
      ).not.toContain('123');
    },
  );

  it('does not cache failed or final personalized data and permits immediate recovery', async () => {
    const provider = new TmdbDiscoveryProvider(config);
    fetchMock.mockRejectedValueOnce(new Error('outage')).mockResolvedValue(
      Response.json({
        page: 1,
        total_pages: 0,
        total_results: 0,
        results: [],
      }),
    );

    await expect(provider.findFavoriteSimilar('tv', 1)).rejects.toThrow(
      'Movie provider request failed',
    );

    expect(await provider.findFavoriteSimilar('tv', 1)).toEqual({
      results: [],
      availability: 'available',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
