import axios from 'axios';
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

vi.mock('axios');
const mockedAxios = vi.mocked(axios);
const mockedIsAxiosError = vi.mocked(mockedAxios.isAxiosError);

describe('API functions', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should post movie data', async () => {
    mockedAxios.post.mockResolvedValue(undefined);

    await expect(postMovie(mockMovieData)).resolves.toBeUndefined();
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:4000/movies',
      mockMovieData
    );
  });

  it('should delete movie data by id', async () => {
    const { id } = mockMovieData;
    mockedAxios.delete.mockResolvedValue(undefined);

    await expect(deleteMovie(id)).resolves.toBeUndefined();
    expect(mockedAxios.delete).toHaveBeenCalledWith(
      'http://localhost:4000/movies/1234'
    );
  });

  it('should update movie data', async () => {
    mockedAxios.put.mockResolvedValue({ data: mockMovieData });

    const response = await putMovie(mockMovieData);
    expect(response).toEqual(mockMovieData);
    expect(mockedAxios.put).toHaveBeenCalledWith(
      'http://localhost:4000/movies',
      mockMovieData
    );
  });

  it('should get movie by id', async () => {
    const { id } = mockMovieData;
    mockedAxios.get.mockResolvedValue({ data: mockMovieData });

    const response = await getMovie(id);
    expect(response).toEqual(mockMovieData);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'http://localhost:4000/movies/1234'
    );
  });

  it('should get movies with URL parameters', async () => {
    const params: URLParams = {
      genres: null,
      sort: null,
    };
    mockedAxios.get.mockResolvedValueOnce({ data: mockMoviesData });

    const response = await getMovies(params);
    expect(response).toEqual(mockMoviesData);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'http://localhost:4000/movies',
      {
        params: {
          sort: 'title',
          sortOrder: 'asc',
        },
      }
    );
  });

  it('should map URL search, genre, and sort state to API query parameters', async () => {
    const params: URLParams = {
      genres: 'crime',
      sort: 'releaseDate',
      search: 'zodiac',
    };
    mockedAxios.get.mockResolvedValueOnce({ data: mockMoviesData });

    await getMovies(params);

    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: {
          sort: 'releaseDate',
          sortOrder: 'asc',
          genre: 'crime',
          search: 'zodiac',
        },
      })
    );
  });

  it('should normalize display sort labels to API sort fields', () => {
    expect(sortParams('Release Date')).toBe('releaseDate');
    expect(sortParams('Rating')).toBe('rating');
    expect(sortParams(null)).toBe('title');
    expect(sortParams('Title')).toBe('title');
  });

  it('should identify 404 API errors as not found', () => {
    const error = { response: { status: 404 } };
    mockedIsAxiosError.mockReturnValueOnce(true);

    expect(isNotFoundError(error)).toBe(true);
    expect(mockedIsAxiosError).toHaveBeenCalledWith(error);
  });

  it('should not treat non-404 or non-Axios errors as not found', () => {
    mockedIsAxiosError.mockReturnValueOnce(true).mockReturnValueOnce(false);

    expect(isNotFoundError({ response: { status: 500 } })).toBe(false);
    expect(isNotFoundError(new Error('boom'))).toBe(false);
  });
});
