import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { MOVIE_PROVIDER } from '../src/movies/movie-provider';
import { TV_PROVIDER, TvProvider } from '../src/tv/tv-provider';
import { minimalTvDetails } from './fixtures/tv';

describe('TV details API (e2e)', () => {
  let app: INestApplication;
  const provider: jest.Mocked<TvProvider> = { findOne: jest.fn() };
  const movieProvider = { findOne: jest.fn(), findPerson: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TV_PROVIDER)
      .useValue(provider)
      .overrideProvider(MOVIE_PROVIDER)
      .useValue(movieProvider)
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    provider.findOne.mockResolvedValue(minimalTvDetails);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the TV contract through independent dependency injection', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/tv/1399')
      .expect(200)
      .expect(minimalTvDetails);
    expect(provider.findOne).toHaveBeenCalledWith(1399);
    expect(movieProvider.findOne).not.toHaveBeenCalled();
    expect(movieProvider.findPerson).not.toHaveBeenCalled();
  });

  it.each([
    '0',
    '-1',
    '1.5',
    '1e3',
    '0x10',
    '+42',
    ' 42',
    '42 ',
    '9007199254740992',
    'abc',
  ])('rejects invalid ID %s before provider access', async (id) => {
    await request(app.getHttpServer())
      .get('/api/v1/tv/' + encodeURIComponent(id))
      .expect(400)
      .expect((response) => {
        expect(response.body.statusCode).toBe(400);
        expect(Array.isArray(response.body.message)).toBe(true);
      });
    expect(provider.findOne).not.toHaveBeenCalled();
  });

  it('accepts a maximum safe integer ID', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/tv/9007199254740991')
      .expect(200);
    expect(provider.findOne).toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER);
  });

  it('returns the existing error shape for missing series', async () => {
    provider.findOne.mockResolvedValue(undefined);
    await request(app.getHttpServer()).get('/api/v1/tv/1').expect(404).expect({
      statusCode: 404,
      message: 'TV series not found',
      error: 'Not Found',
    });
  });

  it.each([
    [
      new BadGatewayException('Movie provider request failed'),
      502,
      'Movie provider request failed',
    ],
    [
      new BadGatewayException('Movie provider response was invalid'),
      502,
      'Movie provider response was invalid',
    ],
    [
      new GatewayTimeoutException('Movie provider request timed out'),
      504,
      'Movie provider request timed out',
    ],
  ])(
    'preserves provider error convention %s',
    async (error, status, message) => {
      provider.findOne.mockRejectedValue(error);
      await request(app.getHttpServer())
        .get('/api/v1/tv/1')
        .expect(status)
        .expect((response) => {
          expect(response.body.statusCode).toBe(status);
          expect(response.body.message).toBe(message);
        });
    },
  );

  it('retains the safe Retry-After response header', async () => {
    provider.findOne.mockRejectedValue(
      new HttpException(
        {
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Movie provider rate limit reached',
          retryAfter: 30,
        },
        429,
      ),
    );
    await request(app.getHttpServer())
      .get('/api/v1/tv/1')
      .expect(429)
      .expect('Retry-After', '30');
  });

  it.each([
    '/api/v1/tv',
    '/api/v1/tv/1/seasons/0',
    '/api/v1/tv/1/seasons/1/episodes/1',
    '/api/v1/tv/1/recommendations',
  ])('does not expose deferred route %s', async (path) => {
    await request(app.getHttpServer()).get(path).expect(404);
    expect(provider.findOne).not.toHaveBeenCalled();
  });

  it('documents nested TV schemas, nullable fields, ID bounds and errors', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Movie Explorer').setVersion('1').build(),
    );
    const operation = document.paths['/api/v1/tv/{id}'].get;
    expect(Object.keys(operation.responses).sort()).toEqual([
      '200',
      '400',
      '404',
      '429',
      '502',
      '504',
    ]);
    expect(operation.parameters).toContainEqual(
      expect.objectContaining({
        name: 'id',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: Number.MAX_SAFE_INTEGER,
        },
      }),
    );
    const schemas = document.components.schemas;
    expect(schemas.TvSeriesDetailsDto).toMatchObject({
      required: Object.keys(minimalTvDetails),
      properties: {
        mediaType: { enum: ['tv'] },
        firstAirDate: { type: 'string', format: 'date', nullable: true },
        rating: { type: 'number', nullable: true },
        creators: {
          type: 'array',
          items: { $ref: '#/components/schemas/CreditPersonDto' },
        },
        seasons: {
          type: 'array',
          items: { $ref: '#/components/schemas/TvSeasonSummaryDto' },
        },
      },
    });
    expect(schemas.TvSeasonSummaryDto).toMatchObject({
      properties: {
        seasonNumber: { minimum: 0 },
        episodeCount: { nullable: true },
        posterUrl: { nullable: true },
      },
    });
  });
});
