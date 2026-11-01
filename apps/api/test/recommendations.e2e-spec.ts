import { ok } from 'node:assert/strict';
import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import type { RecommendationCategory } from '@movie-explorer/contracts';

import { DiscoveryModule } from '../src/discovery/discovery.module';
import { DISCOVERY_PROVIDER } from '../src/discovery/discovery.tokens';
import { createApiDocument } from '../src/api-document';
import { configureHttp } from '../src/configure-http';
import { HttpErrorFilter } from '../src/http-error.filter';
import { TmdbDiscoveryProvider } from '../src/integrations/tmdb/tmdb-discovery.provider';

describe('Recommendations API', () => {
  let app: INestApplication;
  const provider = { findRecommendationPool: jest.fn(), find: jest.fn() };
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [DiscoveryModule],
    })
      .overrideProvider(DISCOVERY_PROVIDER)
      .useValue(provider)
      .compile();
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
    global.fetch = fetchMock;
    fetchMock.mockRejectedValue(new Error('Unexpected external request'));
    provider.findRecommendationPool.mockResolvedValue({
      results: [],
      availability: 'available',
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it.each<[RecommendationCategory, 'movie' | 'tv']>([
    ['popular-movies', 'movie'],
    ['top-rated-movies', 'movie'],
    ['popular-series', 'tv'],
    ['top-rated-series', 'tv'],
  ])(
    'serves %s independently with existing card identities',
    async (category, type) => {
      const title = {
        id: 1,
        mediaType: type,
        title: 'Title',
        ...(type === 'movie'
          ? { releaseDate: '2025-03-01' }
          : { firstAirDate: '2024-02-01' }),
      };
      provider.findRecommendationPool.mockResolvedValue({
        results: [title],
        availability: 'available',
      });

      await request(app.getHttpServer())
        .get(`/api/v1/recommendations/${category}`)
        .expect(200, {
          category,
          candidateCount: 1,
          availability: 'available',
          results: [title],
        })
        .expect('Cache-Control', 'no-store');
      expect(provider.findRecommendationPool).toHaveBeenCalledWith(category);
      expect(provider.find).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    'unknown',
    'trending',
    'popular-tv',
    'popular-movies?page=1',
    'popular-movies?seed=1',
    'popular-movies?language=en-US',
    'popular-movies?region=HU',
    'popular-movies?category=popular-series',
    'popular-movies?limit=10',
    'popular-movies?refresh=true',
  ])(
    'rejects invalid or unsupported coordinates %s before provider calls',
    async (path) => {
      await request(app.getHttpServer())
        .get(`/api/v1/recommendations/${path}`)
        .expect(400);
      expect(provider.findRecommendationPool).not.toHaveBeenCalled();
    },
  );

  it('represents an available empty source and explicit partial availability', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/recommendations/popular-movies')
      .expect(200, {
        category: 'popular-movies',
        results: [],
        candidateCount: 0,
        availability: 'available',
      });
    provider.findRecommendationPool.mockResolvedValue({
      results: [{ id: 1, title: 'Movie', mediaType: 'movie' }],
      availability: 'partial',
    });
    await request(app.getHttpServer())
      .get('/api/v1/recommendations/popular-movies')
      .expect(200)
      .expect(({ body }) => {
        expect(body.availability).toBe('partial');
        expect(body.candidateCount).toBe(1);
      });
  });

  it.each([new BadGatewayException(), new GatewayTimeoutException()])(
    'preserves classified complete failures (%s)',
    async (error) => {
      provider.findRecommendationPool.mockRejectedValue(error);

      await request(app.getHttpServer())
        .get('/api/v1/recommendations/popular-movies')
        .expect(error.getStatus());
    },
  );

  it('preserves safe Retry-After headers on provider rate limits', async () => {
    provider.findRecommendationPool.mockRejectedValue(
      new HttpException(
        { statusCode: 429, message: 'Rate limited', retryAfter: 30 },
        429,
      ),
    );

    await request(app.getHttpServer())
      .get('/api/v1/recommendations/popular-movies')
      .expect(429)
      .expect('Retry-After', '30');
  });

  it('resamples a real cached pool through HTTP with only five mocked upstream calls', async () => {
    const integration = new TmdbDiscoveryProvider({
      accessToken: 'test-token',
      apiBaseUrl: 'https://api.example/3',
      imageBaseUrl: 'https://images.example/w500',
      language: 'en-US',
    });
    provider.findRecommendationPool.mockImplementation(
      (category: RecommendationCategory) =>
        integration.findRecommendationPool(category),
    );
    fetchMock.mockImplementation((url: URL) => {
      const number = Number(url.searchParams.get('page'));

      return Promise.resolve(
        Response.json({
          page: number,
          total_pages: 10,
          total_results: 200,
          results: Array.from({ length: 20 }, (_, index) => ({
            id: (number - 1) * 20 + index + 1,
            title: 'Movie',
          })),
        }),
      );
    });
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const first = await request(app.getHttpServer())
      .get('/api/v1/recommendations/popular-movies')
      .expect(200);
    jest.spyOn(Math, 'random').mockReturnValue(0.999);
    const second = await request(app.getHttpServer())
      .get('/api/v1/recommendations/popular-movies')
      .expect(200);

    expect(first.body.candidateCount).toBe(100);
    expect(first.body.results).toHaveLength(10);
    expect(
      new Set(first.body.results.map((title: { id: number }) => title.id)).size,
    ).toBe(10);
    expect(first.body.results).not.toEqual(second.body.results);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('keeps a shared finite pool load alive when one client disconnects', async () => {
    const integration = new TmdbDiscoveryProvider({
      accessToken: 'test-token',
      apiBaseUrl: 'https://api.example/3',
      imageBaseUrl: 'https://images.example/w500',
      language: 'en-US',
    });
    let release: (value: Response) => void = () => undefined;
    let started: () => void = () => undefined;
    let joined: () => void = () => undefined;
    const upstreamStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const secondJoined = new Promise<void>((resolve) => {
      joined = resolve;
    });
    fetchMock.mockImplementation(() => {
      started();

      return new Promise<Response>((resolve) => {
        release = resolve;
      });
    });
    provider.findRecommendationPool.mockImplementation(
      (category: RecommendationCategory) => {
        if (provider.findRecommendationPool.mock.calls.length === 2) {
          joined();
        }

        return integration.findRecommendationPool(category);
      },
    );
    const abandoned = request(app.getHttpServer()).get(
      '/api/v1/recommendations/popular-movies',
    );
    abandoned.end(() => undefined);
    await upstreamStarted;
    abandoned.abort();
    const second = request(app.getHttpServer())
      .get('/api/v1/recommendations/popular-movies')
      .expect(200)
      .then((response) => response);
    await secondJoined;
    release(
      Response.json({
        page: 1,
        total_pages: 1,
        total_results: 1,
        results: [{ id: 1, title: 'Movie' }],
      }),
    );

    expect((await second).body.candidateCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await request(app.getHttpServer())
      .get('/api/v1/recommendations/popular-movies')
      .expect(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('documents the route, categories, title union, limits, partial behavior and errors', () => {
    const doc = createApiDocument(app);
    const operation = doc.paths['/api/v1/recommendations/{category}'].get;
    ok(operation);
    expect(operation.summary).toContain('ten');
    expect(operation.parameters).toEqual([
      expect.objectContaining({
        name: 'category',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
          enum: [
            'popular-movies',
            'top-rated-movies',
            'popular-series',
            'top-rated-series',
          ],
        },
      }),
    ]);
    expect(Object.keys(operation.responses).sort()).toEqual([
      '200',
      '400',
      '429',
      '502',
      '504',
    ]);
    expect(operation.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/RecommendationResponseDto',
          },
        },
      },
    });
    ok(doc.components?.schemas);
    expect(doc.components.schemas.RecommendationResponseDto).toMatchObject({
      required: ['category', 'results', 'availability', 'candidateCount'],
      properties: {
        results: {
          maxItems: 10,
          items: {
            oneOf: [
              { $ref: '#/components/schemas/SearchMovieDto' },
              { $ref: '#/components/schemas/SearchSeriesDto' },
            ],
          },
        },
        availability: { enum: ['available', 'partial'] },
        candidateCount: { type: 'integer', minimum: 0, maximum: 100 },
      },
    });
    expect(doc.components.schemas.SearchMovieDto).toBeDefined();
    expect(doc.components.schemas.SearchSeriesDto).toBeDefined();
  });
});
