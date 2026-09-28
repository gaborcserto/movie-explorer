import type {
  MovieDetails,
  MovieListResponse,
} from '@movie-explorer/contracts';
import {
  postMovie,
  deleteMovie,
  putMovie,
  getMovie,
  getMovies,
  isNotFoundError,
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

  it('should post movie data', async () => {
    fetchMock.mockResolvedValue(response());

    await expect(postMovie(mockMovieData)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/movies',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(mockMovieData),
      })
    );
  });

  it('should delete movie data by id', async () => {
    fetchMock.mockResolvedValue(response());

    await expect(deleteMovie(mockMovieData.id)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/movies/1234',
      { method: 'DELETE' }
    );
  });

  it('should update a movie', async () => {
    fetchMock.mockResolvedValue(response(mockMovieData));

    await expect(putMovie(mockMovieData)).resolves.toEqual(mockMovieData);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/movies',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(mockMovieData),
      })
    );
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
    const params: URLParams = { genres: null, sort: null };
    fetchMock.mockResolvedValue(response(mockMoviesData));

    await expect(getMovies(params)).resolves.toEqual(mockMoviesData);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/movies?sort=title&sortOrder=asc',
      {}
    );
  });

  it('should map URL search, genre, and sort state to API query parameters', async () => {
    const params: URLParams = {
      genres: 'crime',
      sort: 'releaseDate',
      search: 'zodiac',
    };
    fetchMock.mockResolvedValue(response(mockMoviesData));

    await getMovies(params);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/movies?sort=releaseDate&sortOrder=asc&search=zodiac&genre=crime',
      {}
    );
  });

  it('should normalize display sort labels to API sort fields', () => {
    expect(sortParams('Release Date')).toBe('releaseDate');
    expect(sortParams('Rating')).toBe('rating');
    expect(sortParams(null)).toBe('title');
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
