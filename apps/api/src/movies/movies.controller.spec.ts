import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type {
  MovieDetails,
  MovieListResponse,
  MovieMutationPayload,
} from '@movie-explorer/contracts';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';

const movie: MovieDetails = {
  id: 1,
  title: 'Movie 1',
  releaseDate: '2020-01-01',
  posterUrl: 'https://example.com/movie-1.jpg',
  genres: ['Drama'],
  rating: 7.5,
  runtimeMinutes: 120,
  description: 'Overview 1',
};

const movieMutation: MovieMutationPayload = {
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
    Pick<MoviesService, 'findAll' | 'findOne' | 'create' | 'update' | 'delete'>
  >;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
      total: 1,
      offset: 0,
      limit: 10,
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

  it('throws not found when a movie does not exist', async () => {
    service.findOne.mockResolvedValue(undefined);

    await expect(controller.getMovie(999)).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      message: 'Movie not found',
    });
  });

  it('creates a movie through the service', async () => {
    service.create.mockResolvedValue(undefined);

    await expect(
      controller.createMovie(movieMutation),
    ).resolves.toBeUndefined();
    expect(service.create).toHaveBeenCalledWith(movieMutation);
  });

  it('wraps create validation errors in a bad request response', async () => {
    service.create.mockRejectedValue(new Error('Validation failed!'));

    await expect(controller.createMovie(movieMutation)).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      message: 'Error creating movie: Validation failed!',
    });
  });

  it('preserves HTTP exceptions from the service', async () => {
    service.create.mockRejectedValue(
      new HttpException('Not implemented', HttpStatus.NOT_IMPLEMENTED),
    );

    await expect(controller.createMovie(movieMutation)).rejects.toMatchObject({
      status: HttpStatus.NOT_IMPLEMENTED,
      message: 'Not implemented',
    });
  });

  it('updates a movie through the service', async () => {
    service.update.mockResolvedValue(movie);

    await expect(controller.updateMovie(1, movieMutation)).resolves.toBe(movie);
    expect(service.update).toHaveBeenCalledWith(1, movieMutation);
  });

  it('throws not found when updating a missing movie', async () => {
    service.update.mockResolvedValue(undefined);

    await expect(
      controller.updateMovie(999, movieMutation),
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      message: 'Movie not found',
    });
  });

  it('deletes an existing movie', async () => {
    service.delete.mockResolvedValue(movie);

    await expect(controller.deleteMovie('1')).resolves.toBeUndefined();
    expect(service.delete).toHaveBeenCalledWith(1);
  });

  it('throws not found when deleting a missing movie', async () => {
    service.delete.mockResolvedValue(undefined);

    await expect(controller.deleteMovie('999')).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      message: 'Movie not found',
    });
  });

  it('throws bad request for a non-numeric delete id', async () => {
    await expect(controller.deleteMovie('abc')).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      message: 'ID must be a number',
    });
    expect(service.delete).not.toHaveBeenCalled();
  });
});
