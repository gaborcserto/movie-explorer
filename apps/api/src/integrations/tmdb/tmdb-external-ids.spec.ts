import { Logger } from '@nestjs/common';

import * as tmdbConfig from './tmdb.config';
import { TmdbExternalIds } from './tmdb-external-ids';
import { TmdbMovieProvider } from './tmdb-movie.provider';
import { TmdbSeriesProvider } from './tmdb-series.provider';
import { TmdbTransport } from './tmdb.transport';
import { minimalSeriesDetails } from '../../../test/fixtures/series';

const config = {
  accessToken: 'test',
  apiBaseUrl: 'https://api.example/3',
  imageBaseUrl: 'https://images.example/w500',
  language: 'en-US',
};

describe('TMDB IMDb identification', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('Unexpected fetch'));
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('lazily reuses configuration and transport across uncached lookups', async () => {
    const getConfig = jest
      .spyOn(tmdbConfig, 'getTmdbConfig')
      .mockReturnValue(config);
    const request = jest.spyOn(TmdbTransport.prototype, 'request');
    fetchMock
      .mockResolvedValueOnce(Response.json({ id: 603, imdb_id: 'tt0133093' }))
      .mockResolvedValueOnce(Response.json({ id: 1396, imdb_id: 'tt0903747' }));
    const ids = new TmdbExternalIds();
    expect(getConfig).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();

    await expect(ids.resolve('movie', 603)).resolves.toBe('tt0133093');
    await expect(ids.resolve('series', 1396)).resolves.toBe('tt0903747');

    expect(getConfig).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.contexts[0]).toBe(request.mock.contexts[1]);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'https://api.example/3/movie/603/external_ids?language=en-US',
    );
    expect(String(fetchMock.mock.calls[1][0])).toBe(
      'https://api.example/3/tv/1396/external_ids?language=en-US',
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      headers: { Authorization: 'Bearer test' },
    });
  });

  it('keeps default transports and configuration separate per resolver instance', async () => {
    const getConfig = jest
      .spyOn(tmdbConfig, 'getTmdbConfig')
      .mockReturnValue(config);
    const request = jest.spyOn(TmdbTransport.prototype, 'request');
    fetchMock.mockImplementation(() =>
      Promise.resolve(Response.json({ id: 603, imdb_id: null })),
    );

    await new TmdbExternalIds().resolve('movie', 603);
    await new TmdbExternalIds().resolve('movie', 603);

    expect(getConfig).toHaveBeenCalledTimes(2);
    expect(request.mock.contexts[0]).not.toBe(request.mock.contexts[1]);
  });

  it('uses explicit configuration without resolving environment defaults', async () => {
    const getConfig = jest
      .spyOn(tmdbConfig, 'getTmdbConfig')
      .mockImplementation(() => {
        throw new Error('Defaults must not be loaded');
      });
    fetchMock.mockResolvedValue(
      Response.json({ id: 603, imdb_id: 'tt0133093' }),
    );

    await expect(
      new TmdbExternalIds(config).resolve('movie', 603),
    ).resolves.toBe('tt0133093');

    expect(getConfig).not.toHaveBeenCalled();
  });

  it('defers configuration errors until an uncached lookup and retries initialization', async () => {
    const error = new Error(
      'Missing required TMDB_ACCESS_TOKEN environment variable',
    );
    const getConfig = jest
      .spyOn(tmdbConfig, 'getTmdbConfig')
      .mockImplementation(() => {
        throw error;
      });
    const ids = new TmdbExternalIds();
    ids.remember('movie', 603, 'tt0133093');
    await expect(ids.resolve('movie', 603)).resolves.toBe('tt0133093');
    expect(getConfig).not.toHaveBeenCalled();

    await expect(ids.resolve('series', 1396)).rejects.toBe(error);
    expect(fetchMock).not.toHaveBeenCalled();

    getConfig.mockReturnValue(config);
    fetchMock.mockResolvedValue(
      Response.json({ id: 1396, imdb_id: 'tt0903747' }),
    );
    await expect(ids.resolve('series', 1396)).resolves.toBe('tt0903747');
    expect(getConfig).toHaveBeenCalledTimes(2);
  });

  it.each([null, 'tt0133093'])(
    'expires cached lookup result %p after one hour',
    async (value) => {
      jest.useFakeTimers();
      fetchMock.mockImplementation(() =>
        Promise.resolve(Response.json({ id: 603, imdb_id: value })),
      );
      const ids = new TmdbExternalIds(config);

      await expect(ids.resolve('movie', 603)).resolves.toBe(value);
      await expect(ids.resolve('movie', 603)).resolves.toBe(value);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(3_600_001);
      await expect(ids.resolve('movie', 603)).resolves.toBe(value);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it('caches not-found results and keeps movie and series cache keys separate', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(Response.json({ id: 603, imdb_id: 'tt0133093' }));
    const ids = new TmdbExternalIds(config);

    await expect(ids.resolve('movie', 603)).resolves.toBeNull();
    await expect(ids.resolve('movie', 603)).resolves.toBeNull();
    await expect(ids.resolve('series', 603)).resolves.toBe('tt0133093');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    [() => new Response('', { status: 503 }), 'Movie provider request failed'],
    [
      () => new Response('', { status: 429 }),
      'Movie provider rate limit reached',
    ],
    [() => new Response('invalid JSON'), 'Movie provider response was invalid'],
    [() => Response.json({ id: 604 }), 'Movie provider response was invalid'],
  ])(
    'propagates upstream errors and retries failed requests (%#)',
    async (response, message) => {
      fetchMock.mockImplementation(response);
      const ids = new TmdbExternalIds(config);

      await expect(
        Promise.all([ids.resolve('movie', 603), ids.resolve('movie', 603)]),
      ).rejects.toThrow(message);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await expect(ids.resolve('movie', 603)).rejects.toThrow(message);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it('preserves configured timeouts', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    );
    const ids = new TmdbExternalIds({ ...config, requestTimeoutMs: 50 });
    const result = expect(ids.resolve('movie', 603)).rejects.toThrow(
      'Movie provider request timed out',
    );

    await jest.advanceTimersByTimeAsync(50);
    await result;
  });

  it.each(['movie', 'series'] as const)(
    'resolves %s external IDs and deduplicates requests',
    async (kind) => {
      fetchMock.mockResolvedValue(
        Response.json({ id: 603, imdb_id: 'tt0133093' }),
      );
      const ids = new TmdbExternalIds(config);
      await expect(
        Promise.all([ids.resolve(kind, 603), ids.resolve(kind, 603)]),
      ).resolves.toEqual(['tt0133093', 'tt0133093']);
      await ids.resolve(kind, 603);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(String(fetchMock.mock.calls[0][0])).toContain(
        `/${kind === 'movie' ? 'movie' : 'tv'}/603/external_ids`,
      );
    },
  );

  it.each([null, '603', '', 'ttabc'])(
    'caches missing or malformed IMDb IDs %p',
    async (value) => {
      const ids = new TmdbExternalIds(config);
      ids.remember('movie', 603, value);
      await expect(ids.resolve('movie', 603)).resolves.toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('reuses the movie details IMDb ID without fetching external IDs', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        id: 603,
        title: 'The Matrix',
        overview: '',
        genres: [],
        vote_average: 8,
        imdb_id: 'tt0133093',
      }),
    );
    const ids = new TmdbExternalIds(config);
    await new TmdbMovieProvider(config, ids).findOne(603);
    await expect(ids.resolve('movie', 603)).resolves.toBe('tt0133093');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('appends series external IDs and reuses the IMDb ID', async () => {
    const body = {
      name: minimalSeriesDetails.title,
      id: 1396,
      external_ids: { imdb_id: 'tt0903747' },
    };
    fetchMock.mockResolvedValue(Response.json(body));
    const ids = new TmdbExternalIds(config);
    await new TmdbSeriesProvider(config, ids).findOne(1396);
    await expect(ids.resolve('series', 1396)).resolves.toBe('tt0903747');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('external_ids');
  });

  it('expires retained IDs after one hour', async () => {
    jest.useFakeTimers();
    const ids = new TmdbExternalIds(config);
    ids.remember('movie', 603, 'tt0133093');
    await jest.advanceTimersByTimeAsync(3_600_001);
    fetchMock.mockResolvedValue(Response.json({ id: 603, imdb_id: null }));
    await expect(ids.resolve('movie', 603)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
