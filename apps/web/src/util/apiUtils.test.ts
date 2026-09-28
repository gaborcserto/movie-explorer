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

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API functions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should post movie data', async () => {
    mockedAxios.post.mockResolvedValue(undefined);

    await expect(postMovie(mockMovieData)).resolves.toBeUndefined();
  });

  it('should delete movie data by id', async () => {
    const { id } = mockMovieData;
    mockedAxios.delete.mockResolvedValue(undefined);

    await expect(deleteMovie(id)).resolves.toBeUndefined();
  });

  it('should update movie data', async () => {
    mockedAxios.put.mockResolvedValue({ data: mockMovieData });

    const response = await putMovie(mockMovieData);
    expect(response).toEqual(mockMovieData);
  });

  it('should get movie by id', async () => {
    const { id } = mockMovieData;
    mockedAxios.get.mockResolvedValue({ data: mockMovieData });

    const response = await getMovie(id);
    expect(response).toEqual(mockMovieData);
  });

  it('should get movies with URL parameters', async () => {
    const params: URLParams = {
      genres: null,
      sort: null,
    };
    mockedAxios.get.mockResolvedValueOnce({ data: mockMoviesData });

    const response = await getMovies(params);
    expect(response).toEqual(mockMoviesData);
  });

  it('should preserve releaseDate sort in API parameters', async () => {
    const params: URLParams = {
      genres: 'crime',
      sort: 'releaseDate',
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
        },
      })
    );
  });
});
