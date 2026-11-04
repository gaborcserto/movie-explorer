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
import { SeriesController } from '../src/series/series.controller';
import { SeriesService } from '../src/series/series.service';
import { SERIES_PROVIDER } from '../src/series/series-provider';
import { configureHttp } from '../src/configure-http';
import { createApiDocument } from '../src/api-document';
import { HttpErrorFilter } from '../src/http-error.filter';

describe('Related titles HTTP routes', () => {
  let app: INestApplication;
  const movie = { findRelated: jest.fn(), findCollection: jest.fn() };
  const series = { findRelated: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MoviesController, SeriesController],
      providers: [
        MoviesService,
        SeriesService,
        { provide: MOVIE_PROVIDER, useValue: movie },
        { provide: SERIES_PROVIDER, useValue: series },
      ],
    }).compile();
    app = module.createNestApplication();
    configureHttp(app, {
      port: 4000,
      host: undefined,
      origins: ['http://localhost:3000'],
      swaggerEnabled: false,
    });
    app.useGlobalFilters(new HttpErrorFilter());
    await app.init();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    movie.findCollection.mockResolvedValue({
      collection: null,
      results: [],
      availability: 'available',
    });
  });
  afterAll(async () => {
    await app.close();
  });

  it('serves collection, recommended and similar movies through the existing Similar route', async () => {
    const title = (id: number) => ({
      mediaType: 'movie',
      id,
      title: `Movie ${id}`,
    });
    movie.findCollection.mockResolvedValue({
      collection: { id: 10 },
      results: [title(2), title(3)],
      availability: 'available',
    });
    movie.findRelated.mockImplementation(async (_id, kind) => ({
      results:
        kind === 'recommendations'
          ? [title(3), title(4), title(1)]
          : [title(5), title(4)],
      availability: 'available',
    }));

    await request(app.getHttpServer())
      .get('/api/v1/movies/1/similar')
      .expect(200, {
        results: [2, 3, 4, 5].map(title),
        availability: 'available',
      });
    expect(movie.findCollection).toHaveBeenCalledTimes(1);
    expect(movie.findRelated).toHaveBeenCalledTimes(2);
  });

  describe.each(['movies', 'series'])('%s', (resource) => {
    const provider = resource === 'movies' ? movie : series;

    describe.each(['similar', 'recommendations'])('%s', (kind) => {
      it.each(['available', 'partial'])(
        'serves independent %s results through its own provider',
        async (availability) => {
          const result = {
            availability,
            results: [
              {
                id: 2,
                mediaType: resource === 'movies' ? 'movie' : 'tv',
                title: 'Title',
              },
            ],
          };
          provider.findRelated.mockResolvedValue(result);
          await request(app.getHttpServer())
            .get(`/api/v1/${resource}/1/${kind}`)
            .expect(200, result);
          expect(provider.findRelated).toHaveBeenCalledWith(1, kind);
          expect(
            (resource === 'movies' ? series : movie).findRelated,
          ).not.toHaveBeenCalled();
        },
      );

      it.each(['0', '-1', '1.5', '1e2', 'abc', '9007199254740992'])(
        'rejects invalid ID %s before provider work',
        async (id) => {
          await request(app.getHttpServer())
            .get(`/api/v1/${resource}/${id}/${kind}`)
            .expect(400);
          expect(provider.findRelated).not.toHaveBeenCalled();
        },
      );

      it.each([
        new NotFoundException(),
        new BadGatewayException(),
        new GatewayTimeoutException(),
        new HttpException('Provider rate limit reached', 429),
      ])('preserves HTTP errors %s', async (error) => {
        provider.findRelated.mockRejectedValue(error);
        await request(app.getHttpServer())
          .get(`/api/v1/${resource}/1/${kind}`)
          .expect(error.getStatus());
      });

      it('documents summaries, availability, bounds and classified errors in the existing resource group', () => {
        const document = createApiDocument(app);
        const operation =
          document.paths[`/api/v1/${resource}/{id}/${kind}`].get;
        ok(operation);
        expect(operation.tags).toEqual([
          resource === 'movies' ? 'Movies' : 'Series',
        ]);
        expect(Object.keys(operation.responses)).toEqual(
          expect.arrayContaining(['200', '400', '404', '429', '502', '504']),
        );
        expect(JSON.stringify(operation.responses['200'])).toContain(
          'RelatedTitlesResponseDto',
        );
        const schema = document.components?.schemas?.RelatedTitlesResponseDto;
        ok(schema && 'properties' in schema);
        expect(schema.properties?.availability).toMatchObject({
          enum: ['available', 'partial'],
        });
        expect(schema.properties?.results).toMatchObject({
          maxItems: 10,
          items: {
            oneOf: [
              { $ref: '#/components/schemas/SearchMovieDto' },
              { $ref: '#/components/schemas/SearchSeriesDto' },
            ],
          },
        });
        expect(document.components?.schemas?.SearchMovieDto).toBeDefined();
        expect(document.components?.schemas?.SearchSeriesDto).toBeDefined();
        expect(
          Object.keys(document.paths).some((path) =>
            path.startsWith('/api/v1/tv/'),
          ),
        ).toBe(false);
      });
    });
  });
});
