import { HttpException, Logger } from '@nestjs/common';
import { TmdbMovieProvider } from './tmdb-movie.provider';

const config = {
  accessToken: 'private-token',
  apiBaseUrl: 'https://example.com',
  imageBaseUrl: 'https://example.com/w500',
  language: 'en-US',
};
const movie = {
  id: 1,
  title: 'Primary movie',
  overview: 'Overview',
  genres: [],
  poster_path: null,
  vote_average: 0,
  runtime: null,
  original_title: 'Original movie',
  status: 'Released',
  original_language: 'en',
  budget: 1000000,
  revenue: 0,
  credits: { cast: [{ id: 2, name: 'Actor', order: 0 }], crew: [] },
  images: { backdrops: [{ file_path: '/still.jpg' }], posters: [] },
  videos: { results: [{ name: 'Trailer', site: 'YouTube', key: 'key' }] },
};

describe('partial detail recovery', () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;
  const provider = new TmdbMovieProvider(config);
  let log: jest.SpyInstance;
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    log = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it.each(['credits', 'images', 'videos'] as const)(
    'isolates invalid %s and retains other sections',
    async (section) => {
      fetchMock.mockResolvedValue(
        Response.json({
          ...movie,
          [section]: { success: false, message: 'private-token' },
        }),
      );

      const result = await provider.findOne(1);
      const key = section === 'images' ? 'photos' : section;
      expect(result).toMatchObject({
        title: 'Primary movie',
        originalTitle: 'Original movie',
        status: 'Released',
        originalLanguage: 'en',
        budget: 1000000,
        revenue: 0,
        description: 'Overview',
        sections: { [key]: { status: 'unavailable' } },
      });
      if (section !== 'credits') expect(result?.cast).toEqual(['Actor']);
      if (section !== 'images')
        expect(result?.backdrops?.[0].fullUrl).toBe(
          'https://example.com/original/still.jpg',
        );
      if (section !== 'videos')
        expect(result?.videos?.[0].name).toBe('Trailer');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledWith({
        operation: `movie-${key}`,
        failure: 'invalid-response',
        upstreamStatus: 200,
        applicationStatus: 502,
      });
      expect(JSON.stringify(log.mock.calls)).not.toMatch(
        /private|example.com|message/,
      );
    },
  );

  it('retains primary data through multiple failures and distinguishes successful empty videos', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        ...movie,
        credits: null,
        images: null,
        videos: { results: [] },
      }),
    );
    await expect(provider.findOne(1)).resolves.toMatchObject({
      cast: [],
      videos: [],
      sections: {
        credits: { status: 'unavailable' },
        photos: { status: 'unavailable' },
        videos: { status: 'available' },
      },
    });
  });

  it('falls back once to a primary-only request after an atomic upstream failure', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(
        Response.json({
          ...movie,
          credits: undefined,
          images: undefined,
          videos: undefined,
        }),
      );
    await expect(provider.findOne(1)).resolves.toMatchObject({
      title: 'Primary movie',
      sections: {
        credits: { status: 'unavailable' },
        photos: { status: 'unavailable' },
        videos: { status: 'unavailable' },
      },
    });
    expect(
      fetchMock.mock.calls.map(([url]) =>
        url.searchParams.get('append_to_response'),
      ),
    ).toEqual(['credits,images,videos', null]);
  });

  it('never converts malformed primary data into partial success', async () => {
    fetchMock.mockResolvedValue(Response.json({ ...movie, genres: [null] }));
    await expect(provider.findOne(1)).rejects.toMatchObject({ status: 502 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  describe.each(['movie', 'person'] as const)('%s detail fallback', (kind) => {
    const primary =
      kind === 'movie'
        ? { ...movie, credits: undefined, images: undefined, videos: undefined }
        : { id: 1, name: 'Primary person' };
    const load = () =>
      kind === 'movie' ? provider.findOne(1) : provider.findPerson(1);

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it.each(['connection', 401, 403, 500, 503, 504] as const)(
      'falls back immediately once after %s without append parameters',
      async (failure) => {
        if (failure === 'connection') {
          fetchMock.mockRejectedValueOnce(
            new Error('private connection error'),
          );
        } else {
          fetchMock.mockResolvedValueOnce(
            new Response(null, { status: failure }),
          );
        }
        fetchMock.mockResolvedValueOnce(Response.json(primary));

        await expect(load()).resolves.toMatchObject(
          kind === 'movie'
            ? {
                title: movie.title,
                sections: {
                  credits: { status: 'unavailable' },
                  photos: { status: 'unavailable' },
                  posters: { status: 'unavailable' },
                  videos: { status: 'unavailable' },
                },
              }
            : {
                name: 'Primary person',
                filmography: [],
                filmographyAvailability: { status: 'unavailable' },
              },
        );
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const urls: URL[] = fetchMock.mock.calls.map(([url]: [URL]) => url);
        expect(urls.map((url) => url.pathname)).toEqual([
          `/${kind}/1`,
          `/${kind}/1`,
        ]);
        expect(urls[0].searchParams.get('append_to_response')).toBe(
          kind === 'movie' ? 'credits,images,videos' : 'movie_credits,images',
        );
        expect([...urls[1].searchParams]).toEqual([['language', 'en-US']]);
      },
    );

    it.each(['json', 'shape', 'rate-limit'] as const)(
      'does not fall back after an appended %s failure',
      async (failure) => {
        fetchMock
          .mockResolvedValueOnce(
            failure === 'rate-limit'
              ? new Response(null, {
                  status: 429,
                  headers: { 'Retry-After': '15' },
                })
              : failure === 'json'
                ? new Response('invalid JSON')
                : Response.json([]),
          )
          .mockResolvedValueOnce(Response.json(primary));

        await expect(load()).rejects.toMatchObject({
          status: failure === 'rate-limit' ? 429 : 502,
          message:
            failure === 'rate-limit'
              ? 'Movie provider rate limit reached'
              : 'Movie provider response was invalid',
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
      },
    );

    it.each([404, 429, 503])(
      'uses the primary-only HTTP %s outcome without a third attempt',
      async (status) => {
        fetchMock
          .mockResolvedValueOnce(new Response(null, { status: 502 }))
          .mockResolvedValueOnce(
            new Response(null, { status, headers: { 'Retry-After': '15' } }),
          );

        if (status === 404) {
          await expect(load()).resolves.toBeUndefined();
        } else {
          await expect(load()).rejects.toMatchObject({
            status: status === 429 ? 429 : 502,
            message:
              status === 429
                ? 'Movie provider rate limit reached'
                : 'Movie provider request failed',
          });
        }
        expect(fetchMock).toHaveBeenCalledTimes(2);
      },
    );

    it.each(['json', 'primary'] as const)(
      'rejects invalid primary-only %s without a third attempt',
      async (failure) => {
        fetchMock
          .mockResolvedValueOnce(new Response(null, { status: 502 }))
          .mockResolvedValueOnce(
            failure === 'json'
              ? new Response('invalid JSON')
              : Response.json({}),
          );

        await expect(load()).rejects.toMatchObject({
          status: 502,
          message:
            failure === 'json' || kind === 'movie'
              ? 'Movie provider response was invalid'
              : 'Person provider response was invalid',
        });
        expect(fetchMock).toHaveBeenCalledTimes(2);
      },
    );
  });

  it.each(['credits', 'photos', 'videos'] as const)(
    'recovers only the requested %s resource',
    async (section) => {
      const source = section === 'photos' ? 'images' : section;
      fetchMock.mockResolvedValue(Response.json(movie[source]));
      const result = await provider.findMovieSection(1, section);
      expect(result).toHaveProperty(
        section === 'credits'
          ? 'cast'
          : section === 'photos'
            ? 'backdrops'
            : section,
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0].pathname).toBe(`/movie/1/${source}`);
    },
  );

  it('recovers filmography without requesting the profile', async () => {
    fetchMock.mockResolvedValue(Response.json({ cast: [], crew: [] }));
    await expect(provider.findFilmography(1)).resolves.toEqual({
      filmography: [],
    });
    expect(fetchMock.mock.calls[0][0].pathname).toBe('/person/1/movie_credits');
  });

  it('preserves rate-limit metadata on section retries', async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 429, headers: { 'Retry-After': '15' } }),
    );
    const result = await provider
      .findMovieSection(1, 'videos')
      .catch((error: HttpException) => error);
    expect(result).toBeInstanceOf(HttpException);
    expect((result as HttpException).getResponse()).toMatchObject({
      statusCode: 429,
      retryAfter: 15,
    });
  });
});
