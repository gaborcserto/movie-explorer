import { ok } from 'node:assert/strict';
import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { MoviesController } from '../src/movies/movies.controller';
import { MoviesService } from '../src/movies/movies.service';
import { MOVIE_PROVIDER } from '../src/movies/movie-provider';
import { configureHttp } from '../src/configure-http';
import { createApiDocument } from '../src/api-document';
import { HttpErrorFilter } from '../src/http-error.filter';

describe('Movie collection HTTP contract', () => {
  let app: INestApplication;
  const provider = { findCollection: jest.fn(), findRelated: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MoviesController],
      providers: [
        MoviesService,
        { provide: MOVIE_PROVIDER, useValue: provider },
      ],
    }).compile();
    app = module.createNestApplication();
    configureHttp(app, {
      port: 4000,
      host: undefined,
      origins: [],
      swaggerEnabled: false,
    });
    app.useGlobalFilters(new HttpErrorFilter());
    await app.init();
  });

  beforeEach(() => jest.resetAllMocks());
  afterAll(async () => {
    await app.close();
  });

  it.each([
    { collection: null, results: [], availability: 'available' },
    {
      collection: { id: 10, name: 'Collection' },
      results: [{ mediaType: 'movie', id: 2, title: 'Other' }],
      availability: 'partial',
    },
  ])(
    'serves normalized empty/partial results without recommendation requests',
    async (result) => {
      provider.findCollection.mockResolvedValue(result);
      await request(app.getHttpServer())
        .get('/api/v1/movies/1/collection')
        .expect(200, result);
      expect(provider.findCollection).toHaveBeenCalledWith(1);
      expect(provider.findRelated).not.toHaveBeenCalled();
    },
  );

  it.each(['0', '-1', '1.5', '1e2', 'abc', '9007199254740992'])(
    'validates ID %s before provider work',
    async (id) => {
      await request(app.getHttpServer())
        .get(`/api/v1/movies/${id}/collection`)
        .expect(400);
      expect(provider.findCollection).not.toHaveBeenCalled();
    },
  );

  it.each([
    new NotFoundException(),
    new BadGatewayException(),
    new GatewayTimeoutException(),
    new HttpException({ message: 'Rate limit', retryAfter: 3 }, 429),
  ])('preserves classified error %s', async (error) => {
    provider.findCollection.mockRejectedValue(error);
    const response = await request(app.getHttpServer())
      .get('/api/v1/movies/1/collection')
      .expect(error.getStatus());

    if (error.getStatus() === 429) {
      expect(response.headers['retry-after']).toBe('3');
    }
  });

  it('documents movie-only collection cards, nullable membership and error responses in Swagger', () => {
    const document = createApiDocument(app);
    const operation = document.paths['/api/v1/movies/{id}/collection'].get;
    ok(operation);
    expect(operation.tags).toEqual(['Movies']);
    expect(Object.keys(operation.responses)).toEqual(
      expect.arrayContaining(['200', '400', '404', '429', '502', '504']),
    );
    const schema = document.components?.schemas?.MovieCollectionResponseDto;
    ok(schema && 'properties' in schema);
    expect(schema.properties?.collection).toMatchObject({ nullable: true });
    expect(schema.properties?.results).toMatchObject({
      items: { $ref: '#/components/schemas/SearchMovieDto' },
    });
    expect(schema.properties?.availability).toMatchObject({
      enum: ['available', 'partial'],
    });
  });
});
