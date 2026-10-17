import { HttpException, Logger } from '@nestjs/common';
import { TmdbMovieProvider } from './tmdb-movie.provider';
import { parseRetryAfter } from './retry-after';

describe('TMDB request failures', () => {
  it.each(['details', 'list', 'genres'])(
    'sanitizes malformed successful %s data before mapper errors escape',
    async (kind) => {
      if (kind === 'details') {
        fetchMock.mockResolvedValue(
          Response.json({
            id: 1,
            title: 'Movie',
            credits: { cast: [null], crew: [] },
            images: { backdrops: [] },
            videos: { results: [] },
          }),
        );
      } else {
        fetchMock
          .mockResolvedValueOnce(
            Response.json({
              results: [null],
              page: 1,
              total_pages: 1,
              total_results: 1,
            }),
          )
          .mockResolvedValueOnce(
            Response.json({ genres: kind === 'genres' ? [null] : [] }),
          );
      }
      await expect(
        kind === 'details' ? provider.findOne(1) : provider.findAll({}),
      ).rejects.toMatchObject({ status: 502 });
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          failure: 'invalid-response',
          applicationStatus: 502,
        }),
      );
    },
  );
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;
  let log: jest.SpyInstance;
  let provider: TmdbMovieProvider;
  beforeEach(() => {
    global.fetch = fetchMock;
    fetchMock.mockReset();
    log = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    provider = new TmdbMovieProvider({
      accessToken: 'private-token',
      apiBaseUrl: 'https://example.com',
      imageBaseUrl: 'https://example.com/images',
      language: 'en-US',
      requestTimeoutMs: 8000,
    });
  });
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each(['movie', 'person'])('allows missing %s details', async (kind) => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    await expect(
      kind === 'movie' ? provider.findOne(1) : provider.findPerson(1),
    ).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        failure: 'not-found',
        applicationStatus: 404,
        upstreamStatus: 404,
      }),
    );
  });

  it.each(['list', 'search', 'genres', 'people', 'suggestions'])(
    'rejects unexpected 404 for %s',
    async (kind) => {
      fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
      const calls = {
        list: () => provider.findAll({}),
        search: () => provider.findAll({ search: 'test' }),
        genres: () => provider.findAll({ genre: 'drama' }),
        people: () => provider.findPeople('test', 1),
        suggestions: () => provider.findSuggestions('test', 6),
      };
      await expect(calls[kind]()).rejects.toMatchObject({
        status: 502,
        message: 'Movie provider request failed',
      });
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          upstreamStatus: 404,
          applicationStatus: 502,
        }),
      );
    },
  );

  it.each([401, 403, 500, 503])(
    'sanitizes upstream HTTP %s',
    async (status) => {
      fetchMock.mockResolvedValue(
        new Response('private upstream body', { status }),
      );
      const error: HttpException = await provider.findOne(1).then(
        () => {
          throw new Error('Expected failure');
        },
        (caught: HttpException) => caught,
      );
      expect(error.getResponse()).toEqual({
        statusCode: 502,
        error: 'Bad Gateway',
        message: 'Movie provider request failed',
      });
      expect(JSON.stringify(log.mock.calls)).not.toMatch(
        /private|example.com|Bearer/,
      );
    },
  );

  it.each([
    '15',
    'invalid',
    '-1',
    '0',
    '999999999',
    '1.5',
    '1e3',
    '15\r\nX: bad',
  ])('preserves only safe Retry-After: %s', async (header) => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: () => header },
    });
    const error: HttpException = await provider.findOne(1).then(
      () => {
        throw new Error('Expected failure');
      },
      (caught: HttpException) => caught,
    );
    expect(error.getStatus()).toBe(429);
    expect(error.getResponse()).toEqual({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Movie provider rate limit reached',
      ...(header === '15' && { retryAfter: 15 }),
    });
  });

  it('validates HTTP-date Retry-After values', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    expect(parseRetryAfter('Thu, 01 Jan 2026 00:01:00 GMT')).toBe(60);
    expect(parseRetryAfter('Wed, 31 Dec 2025 23:59:59 GMT')).toBeUndefined();
    expect(parseRetryAfter('2026-01-01')).toBeUndefined();
  });

  it.each(['fetch', 'body'])(
    'times out during %s with sanitized diagnostics',
    async (stage) => {
      jest.useFakeTimers();
      fetchMock.mockImplementation((_url: URL, init: RequestInit) => {
        const pending = () =>
          new Promise((_resolve, reject) =>
            init.signal?.addEventListener(
              'abort',
              () => reject(new Error('private error')),
              { once: true },
            ),
          );
        return stage === 'fetch'
          ? pending()
          : Promise.resolve({ ok: true, status: 200, json: pending });
      });
      const result = expect(provider.findOne(1)).rejects.toMatchObject({
        status: 504,
        message: 'Movie provider request timed out',
      });
      await jest.advanceTimersByTimeAsync(8000);
      await result;
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'movie-detail',
          failure: 'timeout',
          applicationStatus: 504,
        }),
      );
      expect(jest.getTimerCount()).toBe(0);
    },
  );

  it.each(['connection', 'json', 'shape'])(
    'diagnoses and sanitizes %s failure',
    async (failure) => {
      jest.useFakeTimers();
      if (failure === 'connection')
        fetchMock.mockRejectedValue(new Error('private error'));
      else
        fetchMock.mockResolvedValue(
          new Response(failure === 'json' ? 'private invalid json' : 'null'),
        );
      await expect(provider.findOne(1)).rejects.toMatchObject({ status: 502 });
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          failure: failure === 'connection' ? 'connection' : 'invalid-response',
          applicationStatus: 502,
        }),
      );
      expect(JSON.stringify(log.mock.calls)).not.toMatch(
        /private|example.com|Bearer/,
      );
      expect(jest.getTimerCount()).toBe(0);
    },
  );

  it('keeps empty successful collections valid and clears deadlines', async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValue(
      Response.json({ results: [], page: 1, total_pages: 0, total_results: 0 }),
    );
    await expect(provider.findPeople('test', 1)).resolves.toMatchObject({
      people: [],
      totalResults: 0,
    });
    expect(jest.getTimerCount()).toBe(0);
  });
});
