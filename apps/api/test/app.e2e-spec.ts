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
  findSuggestions: jest.fn(),
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
      page: 1,
      totalPages: 1,
      totalResults: 1,
    });
    movieProvider.findOne.mockResolvedValue({
      ...movies[0],
      cast: ['Actor One'],
      rating: 7.7,
      runtimeMinutes: 108,
      description: 'Determined to prove herself, Officer Judy Hopps...',
    });
    movieProvider.findSuggestions.mockResolvedValue({ suggestions: [] });
  });

  it('/movies (GET)', () => {
    return request(app.getHttpServer())
      .get('/movies')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({
          movies: expect.any(Array),
          page: 1,
          totalPages: 1,
          totalResults: expect.any(Number),
        });
        expect(response.body.totalResults).toBeGreaterThan(0);
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
          cast: expect.any(Array),
        });
      });
  });

  it('/movies (GET) supports search, filters, and pagination parameters', () => {
    movieProvider.findAll.mockResolvedValueOnce({
      movies,
      page: 2,
      totalPages: 2,
      totalResults: 21,
    });

    return request(app.getHttpServer())
      .get('/movies')
      .query({
        search: 'Zootopia',
        genre: 'animation',
        releaseYear: 2016,
        minimumRating: 7,
        page: 2,
      })
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
          page: 2,
          totalPages: 2,
          totalResults: 21,
        });
      });
  });

  it('/movies (GET) supports explicit popularity direction', async () => {
    await request(app.getHttpServer())
      .get('/movies')
      .query({ sort: 'popularity', sortOrder: 'asc' })
      .expect(200);

    expect(movieProvider.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sort: 'popularity',
        sortOrder: 'asc',
      }),
    );
  });

  it('/movies (GET) rejects invalid query parameters', () => {
    return request(app.getHttpServer())
      .get('/movies')
      .query({ sort: 'unknown' })
      .expect(400);
  });

  it('/movies/suggestions (GET) validates and forwards compact searches', async () => {
    movieProvider.findSuggestions.mockResolvedValueOnce({
      suggestions: [{ id: 269149, title: 'Zootopia', releaseYear: 2016 }],
    });

    await request(app.getHttpServer())
      .get('/movies/suggestions')
      .query({ query: 'Zoo', limit: 5 })
      .expect(200)
      .expect({
        suggestions: [{ id: 269149, title: 'Zootopia', releaseYear: 2016 }],
      });
    expect(movieProvider.findSuggestions).toHaveBeenCalledWith('Zoo', 5);

    await request(app.getHttpServer())
      .get('/movies/suggestions')
      .query({ query: 'Z' })
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

  it('does not expose movie mutation endpoints', async () => {
    await request(app.getHttpServer()).post('/movies').send({}).expect(404);
    await request(app.getHttpServer()).put('/movies').send({}).expect(404);
    await request(app.getHttpServer()).delete('/movies/1').expect(404);
  });
});
