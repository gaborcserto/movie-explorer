import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { RelatedTitleKind } from '@movie-explorer/contracts';

import { TmdbMovieProvider } from './tmdb-movie.provider';
import { TmdbSeriesProvider } from './tmdb-series.provider';

const config = {
  accessToken: 'isolated-test-token',
  apiBaseUrl: 'https://api.themoviedb.org/3',
  imageBaseUrl: 'https://image.tmdb.org/t/p/w500',
  language: 'hu-HU',
  requestTimeoutMs: 100,
};
const cases: Array<['movie' | 'tv', RelatedTitleKind]> = [
  ['movie', 'similar'],
  ['movie', 'recommendations'],
  ['tv', 'similar'],
  ['tv', 'recommendations'],
];

const page = (results: unknown[]) => ({
  page: 1,
  total_pages: 50,
  total_results: 1000,
  results,
});

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe.each(cases)('%s %s', (mediaType, kind) => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();
  const sourceMock = jest.fn();

  const provider = () =>
    mediaType === 'movie'
      ? new TmdbMovieProvider(config)
      : new TmdbSeriesProvider(config);

  const title = (id: number) => ({
    id,
    title: `Movie ${id}`,
    name: `Series ${id}`,
    poster_path: '/poster.jpg',
    release_date: '2025-01-01',
    first_air_date: '2024-01-01',
    vote_average: 8,
  });

  beforeEach(() => {
    global.fetch = (input, init) => {
      const url = new URL(String(input));

      return url.pathname.endsWith('/1')
        ? sourceMock(input, init)
        : fetchMock(input, init);
    };
    fetchMock.mockReset();
    sourceMock
      .mockReset()
      .mockImplementation(async () => response({ id: 1, genres: [] }));
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('maps one ranked page, excludes current identity, deduplicates and bounds results', async () => {
    fetchMock.mockResolvedValue(
      response(
        page([
          title(1),
          title(2),
          title(2),
          ...Array.from({ length: 20 }, (_, n) => title(n + 3)),
        ]),
      ),
    );
    const result = await provider().findRelated(1, kind);

    expect(result.availability).toBe('available');
    expect(result.results.map((item) => item.id)).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);
    expect(result.results[0]).toMatchObject({
      mediaType,
      title: mediaType === 'movie' ? 'Movie 2' : 'Series 2',
      posterUrl: config.imageBaseUrl + '/poster.jpg',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sourceMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];

    expect(url.pathname).toBe(`/3/${mediaType}/1/${kind}`);
    expect(url.searchParams.get('language')).toBe('hu-HU');
    expect(url.searchParams.get('page')).toBe('1');
    expect(init.headers.Authorization).toBe('Bearer isolated-test-token');
    expect(JSON.stringify(result)).not.toMatch(
      /isolated-test-token|poster_path|total_pages/,
    );
  });

  it('distinguishes empty, intentionally excluded and posterless results', async () => {
    fetchMock.mockResolvedValueOnce(response(page([])));

    await expect(provider().findRelated(1, kind)).resolves.toEqual({
      results: [],
      availability: 'available',
      ...(mediaType === 'movie' && {
        signals: new Map(),
        scores: new Map(),
        sourceSignals: {
          genreIds: [],
          rating: undefined,
          voteCount: undefined,
          popularity: undefined,
          year: undefined,
        },
      }),
    });

    fetchMock.mockResolvedValueOnce(
      response(
        page([
          { ...title(2), poster_path: null },
          { ...title(3), adult: true },
        ]),
      ),
    );
    const result = await provider().findRelated(1, kind);

    expect(result.availability).toBe('available');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].posterUrl).toBeUndefined();
  });

  it('retains usable partial data without calling it a complete success', async () => {
    fetchMock.mockResolvedValue(
      response(
        page([
          null,
          title(2),
          { id: -1 },
          { ...title(3), media_type: 'person' },
        ]),
      ),
    );
    const result = await provider().findRelated(1, kind);

    expect(result.availability).toBe('partial');
    expect(result.results.map((item) => item.id)).toEqual([2]);
  });

  it.each([
    null,
    { results: [] },
    { ...page([]), page: 2 },
    page([null, { id: 2 }]),
  ])('rejects malformed source %j', async (body) => {
    fetchMock.mockResolvedValue(response(body));

    await expect(provider().findRelated(1, kind)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it.each([
    [404, NotFoundException],
    [500, BadGatewayException],
    [401, BadGatewayException],
    [429, HttpException],
  ] as const)(
    'preserves classified HTTP %s without leaking credentials',
    async (status, exception) => {
      fetchMock.mockResolvedValue(
        response({ token: config.accessToken }, status),
      );

      await expect(provider().findRelated(1, kind)).rejects.toBeInstanceOf(
        exception,
      );
    },
  );

  it('classifies connection failures', async () => {
    fetchMock.mockRejectedValue(new Error(config.accessToken));

    await expect(provider().findRelated(1, kind)).rejects.toThrow(
      'Movie provider request failed',
    );
  });

  it('bounds upstream requests with the existing deadline', async () => {
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
    const pending = provider().findRelated(1, kind);
    const assertion = expect(pending).rejects.toBeInstanceOf(
      GatewayTimeoutException,
    );

    await jest.advanceTimersByTimeAsync(100);
    await assertion;
  });
});
