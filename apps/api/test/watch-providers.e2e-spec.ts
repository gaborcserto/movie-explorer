import { Logger, ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { WatchProviders } from '@movie-explorer/contracts';
import * as request from 'supertest';

import { createApiDocument } from '../src/api-document';
import { TmdbMovieProvider } from '../src/integrations/tmdb/tmdb-movie.provider';
import { TmdbSeriesProvider } from '../src/integrations/tmdb/tmdb-series.provider';
import { MOVIE_PROVIDER } from '../src/movies/movie-provider';
import { MoviesController } from '../src/movies/movies.controller';
import { MoviesService } from '../src/movies/movies.service';
import { SERIES_PROVIDER } from '../src/series/series-provider';
import { SeriesController } from '../src/series/series.controller';
import { SeriesService } from '../src/series/series.service';

const config = {
  accessToken: 'test-token',
  apiBaseUrl: 'https://api.themoviedb.org/3',
  imageBaseUrl: 'https://image.tmdb.org/t/p/w500',
  language: 'hu-HU',
  region: 'HU',
  requestTimeoutMs: 100,
};

describe.each([
  ['movies', 'movie', 603],
  ['series', 'tv', 1399],
] as const)('%s Watch Providers HTTP boundary', (kind, tmdbKind, id) => {
  let app: INestApplication;
  const fetchMock = jest.fn<
    ReturnType<typeof fetch>,
    Parameters<typeof fetch>
  >();
  const originalFetch = global.fetch;
  const endpoint = `/api/v1/${kind}/${id}/watch-providers`;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MoviesController, SeriesController],
      providers: [
        MoviesService,
        SeriesService,
        { provide: MOVIE_PROVIDER, useValue: new TmdbMovieProvider(config) },
        { provide: SERIES_PROVIDER, useValue: new TmdbSeriesProvider(config) },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
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

  it('forwards the media ID to the correct TMDB route and returns only normalized HU categories', async () => {
    const row = {
      provider_id: 8,
      provider_name: ' Service ',
      logo_path: '/logo.png',
    };
    const link = `https://www.themoviedb.org/${tmdbKind}/${id}/watch`;
    fetchMock.mockResolvedValue(
      Response.json({
        id,
        results: {
          US: { flatrate: [{ provider_id: 9, provider_name: 'US only' }] },
          HU: { link, flatrate: [row], rent: [row], buy: [row], free: [row] },
        },
      }),
    );
    const expected: WatchProviders = {
      providers: (['streaming', 'rent', 'buy'] as const).map((category) => ({
        id: 8,
        name: 'Service',
        category,
        region: 'HU',
        logoUrl: 'https://image.tmdb.org/t/p/w92/logo.png',
        watchUrl: link,
      })),
    };

    await request(app.getHttpServer()).get(endpoint).expect(200, expected);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      new URL(
        `${config.apiBaseUrl}/${tmdbKind}/${id}/watch/providers?language=hu-HU&region=HU`,
      ),
      {
        signal: expect.any(AbortSignal),
        headers: {
          accept: 'application/json',
          Authorization: 'Bearer test-token',
        },
      },
    );
  });

  it.each([
    {},
    { results: { US: { buy: [{ provider_id: 9, provider_name: 'US' }] } } },
    { results: { HU: { flatrate: [], rent: [], buy: [] } } },
    { results: null },
    { results: [] },
    { results: { HU: null } },
    { results: { HU: [] } },
    { results: { HU: { flatrate: {}, rent: null, buy: 'invalid' } } },
  ])(
    'returns empty availability for incomplete region data: %j',
    async (body) => {
      fetchMock.mockResolvedValue(Response.json(body));

      await request(app.getHttpServer())
        .get(endpoint)
        .expect(200, { providers: [] });
    },
  );

  it('drops malformed rows while retaining a provider without optional metadata', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        results: {
          HU: {
            link: 'javascript:invalid',
            buy: [
              null,
              [],
              {},
              { provider_id: 0, provider_name: 'Invalid' },
              { provider_id: 1, provider_name: ' ' },
              { provider_id: 2, provider_name: 'Store', logo_path: null },
            ],
          },
        },
      }),
    );

    await request(app.getHttpServer())
      .get(endpoint)
      .expect(200, {
        providers: [{ id: 2, name: 'Store', category: 'buy', region: 'HU' }],
      });
  });

  it('preserves upstream 404-to-empty availability semantics', async () => {
    fetchMock.mockResolvedValue(
      new Response('private upstream body', { status: 404 }),
    );

    await request(app.getHttpServer())
      .get(endpoint)
      .expect(200, { providers: [] });
  });

  it.each([null, [], 'invalid', 42])(
    'rejects a malformed upstream body: %j',
    async (body) => {
      fetchMock.mockResolvedValue(Response.json(body));

      await request(app.getHttpServer()).get(endpoint).expect(502, {
        statusCode: 502,
        error: 'Bad Gateway',
        message: 'Movie provider response was invalid',
      });
    },
  );

  it('rejects invalid JSON without exposing the upstream body', async () => {
    fetchMock.mockResolvedValue(new Response('private invalid JSON'));

    await request(app.getHttpServer()).get(endpoint).expect(502, {
      statusCode: 502,
      error: 'Bad Gateway',
      message: 'Movie provider response was invalid',
    });
  });

  it.each([401, 500, 503])('sanitizes upstream HTTP %s', async (status) => {
    fetchMock.mockResolvedValue(
      new Response('private upstream body', { status }),
    );

    await request(app.getHttpServer()).get(endpoint).expect(502, {
      statusCode: 502,
      error: 'Bad Gateway',
      message: 'Movie provider request failed',
    });
  });

  it('preserves the upstream rate-limit classification and retry delay', async () => {
    fetchMock.mockResolvedValue(
      new Response('private body', {
        status: 429,
        headers: { 'Retry-After': '15' },
      }),
    );

    await request(app.getHttpServer()).get(endpoint).expect(429, {
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Movie provider rate limit reached',
      retryAfter: 15,
    });
  });

  it('sanitizes a network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('private connection details'));

    await request(app.getHttpServer()).get(endpoint).expect(502, {
      statusCode: 502,
      error: 'Bad Gateway',
      message: 'Movie provider request failed',
    });
  });

  it('aborts a stalled upstream request and returns a safe timeout', async () => {
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new Error('private timeout')),
            { once: true },
          );
        }),
    );

    await request(app.getHttpServer()).get(endpoint).expect(504, {
      statusCode: 504,
      error: 'Gateway Timeout',
      message: 'Movie provider request timed out',
    });
  });

  it.each(['0', '-1', '1.5', 'invalid', '9007199254740992'])(
    'rejects invalid ID %s before calling TMDB',
    async (invalidId) => {
      await request(app.getHttpServer())
        .get(`/api/v1/${kind}/${invalidId}/watch-providers`)
        .expect(400);

      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('documents the shared DTO with optional logo and watch URL', () => {
    const document = createApiDocument(app);

    expect(
      document.paths[`/api/v1/${kind}/{id}/watch-providers`].get.responses[
        '200'
      ],
    ).toMatchObject({
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/WatchProvidersDto' },
        },
      },
    });
    expect(document.components.schemas.WatchProvidersDto).toMatchObject({
      required: ['providers'],
      properties: {
        providers: {
          type: 'array',
          items: { $ref: '#/components/schemas/WatchProviderDto' },
        },
      },
    });
    expect(document.components.schemas.WatchProviderDto).toMatchObject({
      required: ['id', 'name', 'category', 'region'],
      properties: { category: { enum: ['streaming', 'rent', 'buy'] } },
    });
  });
});
