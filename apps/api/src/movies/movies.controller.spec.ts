import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Movie, MoviesResponse } from './movies.dto';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';

const movie: Movie = {
  id: 1,
  title: 'Movie 1',
  tagline: 'Tagline 1',
  vote_average: 7.5,
  vote_count: 100,
  release_date: '2020-01-01',
  poster_path: 'https://example.com/movie-1.jpg',
  overview: 'Overview 1',
  budget: 1000,
  revenue: 2000,
  runtime: 120,
  genres: ['Drama'],
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
      data: [movie],
      totalAmount: 1,
      offset: 0,
      limit: 10,
    };
    const filter = { search: 'Movie', searchBy: 'title' as const };
    service.findAll.mockReturnValue(response);

    await expect(controller.getAllMovies(filter)).resolves.toBe(response);
    expect(service.findAll).toHaveBeenCalledWith(filter);
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

    await expect(controller.createMovie(movie)).resolves.toBeUndefined();
    expect(service.create).toHaveBeenCalledWith(movie);
  });

  it('wraps create validation errors in a bad request response', async () => {
    service.create.mockRejectedValue(new Error('Validation failed!'));

    await expect(controller.createMovie(movie)).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      message: 'Error creating movie: Validation failed!',
    });
  });

  it('updates a movie through the service', async () => {
    service.update.mockResolvedValue(movie);

    await expect(controller.updateMovie(1, movie)).resolves.toBe(movie);
    expect(service.update).toHaveBeenCalledWith(1, movie);
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
