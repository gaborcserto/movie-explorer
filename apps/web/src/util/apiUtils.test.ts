import type {
  MovieDetails,
  MovieListResponse,
} from '@movie-explorer/contracts';

import {
  getMovie,
  getMovieSection,
  getMovies,
  getMovieSuggestions,
  getDiscoverySection,
  getStreamingProviders,
  getStreamingProviderSection,
  getSearchSuggestions,
  getPeople,
  ApiRequestError,
  isNotFoundError,
  API_REQUEST_TIMEOUT_MS,
  sortParams,
} from './apiUtils';
import type { URLParams } from '../types';
import { ApiRequestError as TransportApiRequestError } from './apiErrors';

test('keeps the public API error constructor identity', () => {
  expect(ApiRequestError).toBe(TransportApiRequestError);
  expect(new TransportApiRequestError('network')).toBeInstanceOf(
    ApiRequestError
  );
});

function response(body?: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

const mockMovieData: MovieDetails = {
  cast: ['Actor One'],
  id: 1234,
  title: 'Sample Movie',
  releaseDate: '2021-01-01',
  posterUrl: '/sample.jpg',
  genres: ['Drama', 'Action'],
  rating: 8.5,
  runtimeMinutes: 120,
  description: 'A sample movie for testing purposes.',
};

const mockMoviesData: MovieListResponse = {
  totalResults: 1,
  movies: [mockMovieData],
  page: 1,
  totalPages: 1,
};

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

test('preserves movie metadata and full cast in the API contract', async () => {
  const body = {
    ...mockMovieData,
    originalTitle: 'Original — Title',
    status: 'Released',
    originalLanguage: 'en',
    budget: 225000000,
    revenue: 2512865567,
    castMembers: Array.from({ length: 25 }, (_, index) => ({
      id: index + 1,
      name: `Actor ${index}`,
    })),
  };
  fetchMock.mockResolvedValueOnce(response(body));
  await expect(getMovie(1234)).resolves.toEqual(body);
});

test.each([null, '100', -1, Infinity, {}])(
  'ignores invalid optional financial metadata %j while preserving primary details',
  async (amount) => {
    fetchMock.mockResolvedValueOnce(
      response({
        ...mockMovieData,
        budget: amount,
        revenue: amount,
        originalTitle: {},
        originalLanguage: 123,
        status: null,
      })
    );
    const result = await getMovie(1234);
    expect(result.title).toBe(mockMovieData.title);
    expect(result.budget).toBeUndefined();
    expect(result.revenue).toBeUndefined();
    expect(result.originalTitle).toBeUndefined();
    expect(result.originalLanguage).toBeUndefined();
    expect(result.status).toBeUndefined();
  }
);

test('accepts categorized media metadata and targets the poster recovery endpoint', async () => {
  const image = {
    thumbnailUrl: '/thumb.jpg',
    fullUrl: '/full.jpg',
    filePath: '/image.jpg',
    width: 1000,
    height: 1500,
    aspectRatio: 0.667,
    language: null,
  };
  const body = {
    ...mockMovieData,
    backdrops: [image],
    posters: [image],
    videos: [
      {
        id: 'id',
        key: 'key',
        site: 'YouTube',
        type: 'Interview',
        language: 'hu',
        name: 'Interview',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
    ],
    sections: {
      credits: { status: 'available' },
      photos: { status: 'available' },
      posters: { status: 'available' },
      videos: { status: 'available' },
    },
  };
  fetchMock
    .mockResolvedValueOnce(response(body))
    .mockResolvedValueOnce(response({ posters: [image] }));
  await expect(getMovie(1234)).resolves.toEqual(body);
  await expect(
    getMovieSection(1234, 'posters', new AbortController().signal)
  ).resolves.toEqual({
    posters: [image],
  });
  expect(fetchMock).toHaveBeenLastCalledWith(
    'http://localhost:4000/api/v1/movies/1234/posters',
    { signal: expect.any(AbortSignal) }
  );
});

test.each([{ width: 'invalid' }, { language: 12 }, { aspectRatio: -1 }])(
  'rejects invalid poster metadata at the API boundary: %j',
  async (metadata) => {
    fetchMock.mockResolvedValueOnce(
      response({
        posters: [
          { thumbnailUrl: '/thumb.jpg', fullUrl: '/full.jpg', ...metadata },
        ],
      })
    );
    await expect(
      getMovieSection(1234, 'posters', new AbortController().signal)
    ).rejects.toMatchObject({
      category: 'invalid-response',
    });
  }
);

test('unavailable posters clear stale media while preserving successful backdrops', async () => {
  const image = { thumbnailUrl: '/thumb.jpg', fullUrl: '/full.jpg' };
  fetchMock.mockResolvedValueOnce(
    response({
      ...mockMovieData,
      backdrops: [image],
      posters: [image],
      videos: [],
      sections: {
        credits: { status: 'available' },
        photos: { status: 'available' },
        posters: { status: 'unavailable' },
        videos: { status: 'available' },
      },
    })
  );
  await expect(getMovie(1234)).resolves.toMatchObject({
    backdrops: [image],
    posters: [],
  });
});

test('normalizes legacy photo retry responses so recovered backdrops replace an unavailable collection', async () => {
  const photos = [{ thumbnailUrl: '/thumb.jpg', fullUrl: '/full.jpg' }];
  fetchMock.mockResolvedValueOnce(response({ photos }));
  await expect(
    getMovieSection(1234, 'photos', new AbortController().signal)
  ).resolves.toMatchObject({ backdrops: photos });
});

describe('API functions', () => {
  it.each(['15', 'invalid', '0', '-1', '999999999', '1.5'])(
    'retains only a validated rate-limit delay: %s',
    async (delay) => {
      fetchMock.mockResolvedValue({
        ...response(undefined, 429),
        headers: new Headers({ 'Retry-After': delay }),
      });
      await expect(getMovie(1)).rejects.toMatchObject({
        category: 'rate-limited',
        status: 429,
        retryAfterSeconds: delay === '15' ? 15 : undefined,
      });
    }
  );

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it.each([
    [400, 'invalid-request'],
    [422, 'invalid-request'],
    [404, 'not-found'],
    [429, 'rate-limited'],
    [500, 'internal-server'],
    [502, 'service-unavailable'],
    [503, 'service-unavailable'],
    [504, 'service-unavailable'],
    [401, 'http'],
  ])(
    'classifies HTTP %s without exposing the response body',
    async (status, category) => {
      fetchMock.mockResolvedValue(
        response('private exception', Number(status))
      );
      await expect(getMovie(1)).rejects.toMatchObject({ category, status });
    }
  );

  it('classifies a connection failure without exposing its message', async () => {
    fetchMock.mockRejectedValue(new TypeError('private connection details'));
    await expect(getMovie(1)).rejects.toMatchObject({
      category: 'network',
      message: 'API request failed: network',
    });
  });

  it('classifies malformed successful JSON and retains its HTTP status', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('private body')),
    });
    await expect(getMovie(1)).rejects.toMatchObject({
      category: 'invalid-response',
      status: 200,
    });
  });

  function pendingFetch() {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener(
            'abort',
            () => reject(init.signal?.reason),
            { once: true }
          );
        })
    );
  }

  it('times out without aborting the caller and removes listeners and timers', async () => {
    vi.useFakeTimers();
    pendingFetch();
    const caller = new AbortController();
    const remove = vi.spyOn(caller.signal, 'removeEventListener');
    const result = expect(
      getSearchSuggestions('Alien', caller.signal)
    ).rejects.toMatchObject({ category: 'timeout' });

    await vi.advanceTimersByTimeAsync(API_REQUEST_TIMEOUT_MS);
    await result;

    expect(caller.signal.aborted).toBe(false);
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('propagates caller cancellation to fetch and classifies it separately', async () => {
    vi.useFakeTimers();
    pendingFetch();
    const caller = new AbortController();
    const result = expect(
      getSearchSuggestions('Alien', caller.signal)
    ).rejects.toMatchObject({ category: 'cancelled' });

    caller.abort(new Error('custom reason'));
    await result;

    expect(fetchMock.mock.calls.at(-1)?.[1].signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not fetch when the caller has already cancelled', async () => {
    const caller = new AbortController();
    caller.abort();
    await expect(getPeople('Alien', 1, caller.signal)).rejects.toMatchObject({
      category: 'cancelled',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('cleans up after success and HTTP failures', async () => {
    vi.useFakeTimers();
    const caller = new AbortController();
    const remove = vi.spyOn(caller.signal, 'removeEventListener');
    fetchMock
      .mockResolvedValueOnce(response(mockMoviesData))
      .mockResolvedValueOnce(response(undefined, 500));
    await getMovies({}, caller.signal);
    await expect(getMovies({}, caller.signal)).rejects.toMatchObject({
      category: 'internal-server',
    });
    expect(remove).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the deadline active while reading JSON', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url: string, init: RequestInit) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener(
              'abort',
              () => reject(init.signal?.reason),
              { once: true }
            );
          }),
      })
    );
    const result = expect(getMovie(1)).rejects.toMatchObject({
      category: 'timeout',
      status: 200,
    });
    await vi.advanceTimersByTimeAsync(API_REQUEST_TIMEOUT_MS);
    await result;
  });

  it('should get movie by id', async () => {
    fetchMock.mockResolvedValue(response(mockMovieData));

    await expect(getMovie(mockMovieData.id)).resolves.toEqual(mockMovieData);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/movies/1234',
      { signal: expect.any(AbortSignal) }
    );
  });

  it('should get movies with URL parameters', async () => {
    const params: URLParams = { genres: null, sort: null, sortOrder: null };
    fetchMock.mockResolvedValue(response(mockMoviesData));

    await expect(getMovies(params)).resolves.toEqual(mockMoviesData);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/movies?sort=popularity&sortOrder=desc',
      { signal: expect.any(AbortSignal) }
    );
  });

  it('preserves TMDB relevance when stale sort state accompanies search', async () => {
    const params: URLParams = {
      genres: 'crime',
      sort: 'releaseDate',
      sortOrder: 'desc',
      search: 'zodiac',
    };
    fetchMock.mockResolvedValue(response(mockMoviesData));

    await getMovies(params);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/movies?search=zodiac&genre=crime',
      { signal: expect.any(AbortSignal) }
    );
  });

  it.each([
    ['popularity', 'asc', 'sort=popularity&sortOrder=asc'],
    ['popularity', 'desc', 'sort=popularity&sortOrder=desc'],
    ['title', 'asc', 'sort=title&sortOrder=asc'],
    ['title', 'desc', 'sort=title&sortOrder=desc'],
    ['releaseDate', 'asc', 'sort=releaseDate&sortOrder=asc'],
    ['releaseDate', 'desc', 'sort=releaseDate&sortOrder=desc'],
    ['rating', 'asc', 'sort=rating&sortOrder=asc'],
    ['rating', 'desc', 'sort=rating&sortOrder=desc'],
  ])('maps %s %s sorting explicitly', async (sort, sortOrder, query) => {
    fetchMock.mockResolvedValue(response(mockMoviesData));

    await getMovies({ sort, sortOrder });

    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:4000/api/v1/movies?${query}`,
      { signal: expect.any(AbortSignal) }
    );
  });

  it('sends explicit popularity ordering for genre discovery', async () => {
    fetchMock.mockResolvedValue(response(mockMoviesData));

    await getMovies({ genres: 'crime' });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/movies?sort=popularity&sortOrder=desc&genre=crime',
      { signal: expect.any(AbortSignal) }
    );
  });

  it('sends multiple genre names as repeated OR filter parameters', async () => {
    fetchMock.mockResolvedValue(response(mockMoviesData));

    await getMovies({ genres: ['action', 'drama'] });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/movies?sort=popularity&sortOrder=desc&genre=action&genre=drama',
      { signal: expect.any(AbortSignal) }
    );
  });

  it('maps advanced filters and pagination to API parameters', async () => {
    fetchMock.mockResolvedValue(response(mockMoviesData));

    await getMovies({
      genres: 'science fiction',
      releaseYear: '2024',
      minimumRating: '7',
      page: 3,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/movies?sort=popularity&sortOrder=desc&genre=science+fiction&releaseYear=2024&minimumRating=7&page=3',
      { signal: expect.any(AbortSignal) }
    );
  });

  it('requests compact movie suggestions through the backend', async () => {
    fetchMock.mockResolvedValue(response({ suggestions: [] }));
    const controller = new AbortController();

    await getMovieSuggestions('Alien', controller.signal);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/movies/suggestions?query=Alien&limit=6',
      { signal: expect.any(AbortSignal) }
    );
  });

  it('requests unified suggestions with encoded queries and cancellation', async () => {
    const result = {
      suggestions: [
        { mediaType: 'person', id: 42, name: 'Person' },
        { mediaType: 'movie', id: 42, title: 'Movie' },
      ],
    };
    fetchMock.mockResolvedValue(response(result));
    const controller = new AbortController();
    await expect(
      getSearchSuggestions('A&B / test?', controller.signal)
    ).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/search/suggestions?query=A%26B+%2F+test%3F&limit=6&includeSeries=true',
      { signal: expect.any(AbortSignal) }
    );
  });

  it('requests the selected discovery page from the application API', async () => {
    const result = {
      results: [],
      page: 2,
      totalPages: 3,
      totalResults: 42,
    };
    fetchMock.mockResolvedValue(response(result));

    await expect(
      getDiscoverySection('popular-movies', new AbortController().signal, 2)
    ).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/discover/popular-movies?page=2',
      { signal: expect.any(AbortSignal) }
    );
  });

  it('loads the regional provider catalog and normalized mixed discovery page', async () => {
    const providers = [{ id: 8, name: 'Netflix' }];
    const results = {
      results: [
        { id: 1, mediaType: 'movie', title: 'Movie' },
        { id: 2, mediaType: 'tv', title: 'Series' },
      ],
      page: 1,
      totalPages: 2,
      totalResults: 42,
    };
    fetchMock
      .mockResolvedValueOnce(response(providers))
      .mockResolvedValueOnce(response(results));

    await expect(
      getStreamingProviders('HU', new AbortController().signal)
    ).resolves.toEqual(providers);
    await expect(
      getStreamingProviderSection(8, 'HU', 1, new AbortController().signal)
    ).resolves.toEqual(results);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://localhost:4000/api/v1/discover/providers?region=HU'
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      'http://localhost:4000/api/v1/discover/streaming/8?region=HU&page=1'
    );
  });

  it('requests independent person pages without movie controls', async () => {
    const result = {
      people: [{ id: 42, name: 'Person' }],
      page: 2,
      totalPages: 3,
      totalResults: 42,
    };
    fetchMock.mockResolvedValue(response(result));
    const controller = new AbortController();
    await expect(getPeople('A&B', 2, controller.signal)).resolves.toEqual(
      result
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/persons?query=A%26B&page=2',
      { signal: expect.any(AbortSignal) }
    );
  });

  it('should normalize display sort labels to API sort fields', () => {
    expect(sortParams(undefined)).toBe('popularity');
    expect(sortParams('')).toBe('popularity');
    expect(sortParams('Release Date')).toBe('releaseDate');
    expect(sortParams('releaseDate')).toBe('releaseDate');
    expect(sortParams('Rating')).toBe('rating');
    expect(sortParams('rating')).toBe('rating');
    expect(sortParams(null)).toBe('popularity');
    expect(sortParams('Popularity')).toBe('popularity');
    expect(sortParams('Relevance')).toBeUndefined();
    expect(sortParams('relevance')).toBeUndefined();
    expect(sortParams('Title')).toBe('title');
    expect(sortParams('title')).toBe('title');
    expect(sortParams('unknown')).toBe('popularity');
  });

  it('should identify 404 API errors as not found', async () => {
    fetchMock.mockResolvedValue(response(undefined, 404));

    let error: unknown;

    try {
      await getMovie(1234);
    } catch (caughtError) {
      error = caughtError;
    }

    expect(isNotFoundError(error)).toBe(true);
  });

  it('should not treat non-404 or non-API errors as not found', async () => {
    fetchMock.mockResolvedValue(response(undefined, 500));

    let error: unknown;

    try {
      await getMovie(1234);
    } catch (caughtError) {
      error = caughtError;
    }

    expect(isNotFoundError(error)).toBe(false);
    expect(isNotFoundError(new Error('boom'))).toBe(false);
  });
});
