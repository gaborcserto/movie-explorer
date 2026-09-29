import type {
  MovieDetails,
  MovieListResponse,
} from '@movie-explorer/contracts';
import { getMovie, getMovies, isNotFoundError, sortParams } from './apiUtils';
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
  total: 1,
  movies: [mockMovieData],
  offset: 0,
  limit: 0,
};

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('API functions', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should get movie by id', async () => {
    fetchMock.mockResolvedValue(response(mockMovieData));

    await expect(getMovie(mockMovieData.id)).resolves.toEqual(mockMovieData);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/movies/1234',
      {}
    );
  });

  it('should get movies with URL parameters', async () => {
    const params: URLParams = { genres: null, sort: null, sortOrder: null };
    fetchMock.mockResolvedValue(response(mockMoviesData));

    await expect(getMovies(params)).resolves.toEqual(mockMoviesData);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/movies?sort=popularity&sortOrder=desc',
      {}
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
      {}
    );
  });

  it.each([
    ['popularity', 'asc', 'sort=popularity&sortOrder=asc'],
    ['popularity', 'desc', 'sort=popularity&sortOrder=desc'],
    ['title', 'asc', 'sort=title&sortOrder=asc'],
    ['title', 'desc', 'sort=title&sortOrder=desc'],
    ['releaseDate', 'asc', 'sort=releaseDate&sortOrder=asc'],
    ['releaseDate', 'desc', 'sort=releaseDate&sortOrder=desc'],
  ])('maps %s %s sorting explicitly', async (sort, sortOrder, query) => {
    fetchMock.mockResolvedValue(response(mockMoviesData));

    await getMovies({ sort, sortOrder });

    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:4000/movies?${query}`,
      {}
    );
  });

  it('sends explicit popularity ordering for genre discovery', async () => {
    fetchMock.mockResolvedValue(response(mockMoviesData));

    await getMovies({ genres: 'crime' });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/movies?sort=popularity&sortOrder=desc&genre=crime',
      {}
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
