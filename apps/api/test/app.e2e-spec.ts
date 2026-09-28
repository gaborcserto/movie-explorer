import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { MOVIE_PROVIDER } from './../src/movies/movie-provider';

const movies = [
  {
    id: 269149,
    title: 'Zootopia',
    releaseDate: '2016-02-11',
    posterUrl: 'https://example.com/posters/zootopia.jpg',
    genres: ['Animation', 'Adventure', 'Family', 'Comedy'],
  },
];

const movieProvider = {
  findAll: jest.fn(),
  findOne: jest.fn(),
};

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MOVIE_PROVIDER)
      .useValue(movieProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    movieProvider.findAll.mockResolvedValue({
      movies,
      total: 1,
      offset: 0,
      limit: 10,
    });
    movieProvider.findOne.mockResolvedValue({
      ...movies[0],
      rating: 7.7,
      runtimeMinutes: 108,
      description: 'Determined to prove herself, Officer Judy Hopps...',
    });
  });

  it('/movies (GET)', () => {
    return request(app.getHttpServer())
      .get('/movies')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({
          movies: expect.any(Array),
          total: expect.any(Number),
          offset: 0,
          limit: 10,
        });
        expect(response.body.movies.length).toBeLessThanOrEqual(10);
        expect(response.body.total).toBeGreaterThan(0);
        expect(response.body.movies[0]).toEqual({
          id: expect.any(Number),
          title: expect.any(String),
          releaseDate: expect.any(String),
          posterUrl: expect.any(String),
          genres: expect.any(Array),
        });
      });
  });

  it('/movies/:id (GET)', async () => {
    const moviesResponse = await request(app.getHttpServer())
      .get('/movies')
      .expect(200);

    const movieId = moviesResponse.body.movies[0].id;

    return request(app.getHttpServer())
      .get(`/movies/${movieId}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({
          id: movieId,
          title: expect.any(String),
          releaseDate: expect.any(String),
          posterUrl: expect.any(String),
          genres: expect.any(Array),
          rating: expect.any(Number),
          runtimeMinutes: expect.any(Number),
          description: expect.any(String),
        });
      });
  });

  it('/movies (GET) supports search and pagination query parameters', () => {
    movieProvider.findAll.mockResolvedValueOnce({
      movies,
      total: 1,
      offset: 0,
      limit: 1,
    });

    return request(app.getHttpServer())
      .get('/movies')
      .query({ search: 'Zootopia', limit: 1, offset: 0 })
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({
          movies: [
            {
              id: expect.any(Number),
              title: expect.stringMatching(/Zootopia/i),
              releaseDate: expect.any(String),
              posterUrl: expect.any(String),
              genres: expect.any(Array),
            },
          ],
          total: expect.any(Number),
          offset: 0,
          limit: 1,
        });
        expect(response.body.total).toBeGreaterThan(0);
      });
  });

  it('/movies (GET) rejects invalid query parameters', () => {
    return request(app.getHttpServer())
      .get('/movies')
      .query({ sort: 'popularity' })
      .expect(400);
  });

  it('/movies/:id (GET) returns 404 when the provider cannot find the movie', () => {
    movieProvider.findOne.mockResolvedValueOnce(undefined);

    return request(app.getHttpServer())
      .get('/movies/999')
      .expect(404)
      .expect((response) => {
        expect(response.body.message).toBe('Movie not found');
      });
  });

  it('/movies/:id (GET) rejects non-numeric IDs', () => {
    return request(app.getHttpServer()).get('/movies/not-a-number').expect(400);
  });

  it('/movies (POST) reports read-only provider behavior', () => {
    return request(app.getHttpServer())
      .post('/movies')
      .send({
        title: 'New Movie',
        releaseDate: '2024-01-01',
        posterUrl: 'https://example.com/posters/new-movie.jpg',
        genres: ['Drama'],
        rating: 7,
        runtimeMinutes: 100,
        description: 'New movie overview',
      })
      .expect(501)
      .expect((response) => {
        expect(response.body.message).toBe(
          'Movie mutations are not supported by the configured movie provider',
        );
      });
  });
});
