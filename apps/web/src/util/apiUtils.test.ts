import type {
  MovieDetails,
  MovieListResponse,
} from '@movie-explorer/contracts';
import {
  getMovie,
  getMovies,
  getMovieSuggestions,
  getSearchSuggestions,
  getPeople,
  isNotFoundError,
  API_REQUEST_TIMEOUT_MS,
  sortParams,
} from './apiUtils';
import type { URLParams } from '../types';

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
      'http://localhost:4000/movies/1234',
      { signal: expect.any(AbortSignal) }
    );
  });

  it('should get movies with URL parameters', async () => {
    const params: URLParams = { genres: null, sort: null, sortOrder: null };
    fetchMock.mockResolvedValue(response(mockMoviesData));

    await expect(getMovies(params)).resolves.toEqual(mockMoviesData);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/movies?sort=popularity&sortOrder=desc',
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
      'http://localhost:4000/movies?search=zodiac&genre=crime',
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
      `http://localhost:4000/movies?${query}`,
      { signal: expect.any(AbortSignal) }
    );
  });

  it('sends explicit popularity ordering for genre discovery', async () => {
    fetchMock.mockResolvedValue(response(mockMoviesData));

    await getMovies({ genres: 'crime' });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/movies?sort=popularity&sortOrder=desc&genre=crime',
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
      'http://localhost:4000/movies?sort=popularity&sortOrder=desc&genre=science+fiction&releaseYear=2024&minimumRating=7&page=3',
      { signal: expect.any(AbortSignal) }
    );
  });

  it('requests compact movie suggestions through the backend', async () => {
    fetchMock.mockResolvedValue(response({ suggestions: [] }));
    const controller = new AbortController();

    await getMovieSuggestions('Alien', controller.signal);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/movies/suggestions?query=Alien&limit=6',
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
      'http://localhost:4000/api/v1/search/suggestions?query=A%26B+%2F+test%3F&limit=6',
      { signal: expect.any(AbortSignal) }
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
    expect(sortParams('Release Date')).toBe('releaseDate');
    expect(sortParams('Rating')).toBe('rating');
    expect(sortParams(null)).toBe('popularity');
    expect(sortParams('Popularity')).toBe('popularity');
    expect(sortParams('Relevance')).toBeUndefined();
    expect(sortParams('Title')).toBe('title');
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
