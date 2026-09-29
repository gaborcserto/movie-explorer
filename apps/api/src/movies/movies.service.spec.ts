import type {
  MovieDetails,
  MovieListResponse,
} from '@movie-explorer/contracts';
import { MovieProvider } from './movie-provider';
import { MoviesService } from './movies.service';

const moviesResponse: MovieListResponse = {
  movies: [
    {
      id: 1,
      title: 'Alpha',
      releaseDate: '2020-01-01',
      posterUrl: 'https://example.com/posters/alpha.jpg',
      genres: ['Drama', 'Comedy'],
    },
  ],
  total: 1,
  offset: 0,
  limit: 10,
};

const movieDetails: MovieDetails = {
  ...moviesResponse.movies[0],
  cast: ['Actor One'],
  rating: 8,
  runtimeMinutes: 100,
  description: 'Alpha overview',
};

describe('MoviesService', () => {
  let service: MoviesService;
  let movieProvider: jest.Mocked<MovieProvider>;

  beforeEach(() => {
    movieProvider = {
      findAll: jest.fn(),
      findOne: jest.fn(),
    };
    service = new MoviesService(movieProvider);
  });

  it('returns movies from the configured provider using query filters', async () => {
    const query = {
      search: 'Alpha',
      genre: ['Drama'],
      sort: 'rating' as const,
      sortOrder: 'desc' as const,
      offset: 0,
      limit: 10,
    };
    movieProvider.findAll.mockResolvedValue(moviesResponse);

    await expect(service.findAll(query)).resolves.toBe(moviesResponse);
    expect(movieProvider.findAll).toHaveBeenCalledWith(query);
  });

  it('finds one movie through the configured provider', async () => {
    movieProvider.findOne.mockResolvedValue(movieDetails);

    await expect(service.findOne(1)).resolves.toBe(movieDetails);
    expect(movieProvider.findOne).toHaveBeenCalledWith(1);
  });

  it('returns undefined when the configured provider cannot find a movie', async () => {
    movieProvider.findOne.mockResolvedValue(undefined);

    await expect(service.findOne(999)).resolves.toBeUndefined();
  });
});
