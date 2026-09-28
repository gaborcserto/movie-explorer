import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
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
});
