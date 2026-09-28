import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MovieDetails, MovieMutationDto, MoviesResponse } from './movies.dto';
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

const movieMutation: MovieMutationDto = {
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
    const response: MoviesResponse = {
      movies: [movie],
      total: 1,
      offset: 0,
      limit: 10,
    };
    const query = { search: 'Movie' };
    service.findAll.mockReturnValue(response as MoviesResponse);

    await expect(controller.getAllMovies(query)).resolves.toBe(response);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('returns a movie by id', async () => {
    service.findOne.mockReturnValue(movie);

    await expect(controller.getMovie('1')).resolves.toBe(movie);
    expect(service.findOne).toHaveBeenCalledWith(1);
  });

  it('throws not found when a movie does not exist', async () => {
    service.findOne.mockReturnValue(undefined);

    await expect(controller.getMovie('999')).rejects.toMatchObject({
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

  it('updates a movie through the service', async () => {
    service.update.mockResolvedValue(movie);

    await expect(controller.updateMovie(1, movieMutation)).resolves.toBe(movie);
    expect(service.update).toHaveBeenCalledWith(1, movieMutation);
  });

  it('deletes an existing movie', async () => {
    service.delete.mockReturnValue(movie);

    await expect(controller.deleteMovie('1')).resolves.toBeUndefined();
    expect(service.delete).toHaveBeenCalledWith(1);
  });

  it('throws bad request for a non-numeric delete id', async () => {
    await expect(controller.deleteMovie('abc')).rejects.toBeInstanceOf(
      HttpException,
    );

    await expect(controller.deleteMovie('abc')).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      message: 'ID must be a number',
    });
  });
});
