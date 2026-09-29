import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type {
  MovieDetails,
  MovieListResponse,
} from '@movie-explorer/contracts';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';

const movie: MovieDetails = {
  cast: ['Actor One'],
  id: 1,
  title: 'Movie 1',
  releaseDate: '2020-01-01',
  posterUrl: 'https://example.com/movie-1.jpg',
  genres: ['Drama'],
  rating: 7.5,
  runtimeMinutes: 120,
  description: 'Overview 1',
};

describe('MoviesController', () => {
  let controller: MoviesController;
  let service: jest.Mocked<
    Pick<MoviesService, 'findAll' | 'findOne' | 'findSuggestions'>
  >;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findSuggestions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MoviesController],
      providers: [{ provide: MoviesService, useValue: service }],
    }).compile();

    controller = module.get(MoviesController);
  });

  it('returns movies from the service using query filters', async () => {
    const response: MovieListResponse = {
      movies: [movie],
      page: 1,
      totalPages: 1,
      totalResults: 1,
    };
    const query = { search: 'Movie' };
    service.findAll.mockResolvedValue(response);

    await expect(controller.getAllMovies(query)).resolves.toBe(response);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('returns a movie by id', async () => {
    service.findOne.mockResolvedValue(movie);

    await expect(controller.getMovie(1)).resolves.toBe(movie);
    expect(service.findOne).toHaveBeenCalledWith(1);
  });

  it('returns movie suggestions from the service', async () => {
    service.findSuggestions.mockResolvedValue({ suggestions: [] });

    await expect(
      controller.getMovieSuggestions({ query: 'Alien', limit: 5 }),
    ).resolves.toEqual({ suggestions: [] });
    expect(service.findSuggestions).toHaveBeenCalledWith('Alien', 5);
  });

  it('throws not found when a movie does not exist', async () => {
    service.findOne.mockResolvedValue(undefined);

    await expect(controller.getMovie(999)).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      message: 'Movie not found',
    });
  });
});
