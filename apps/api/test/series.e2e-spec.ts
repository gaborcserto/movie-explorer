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

import { PERSON_FILMOGRAPHY_PROVIDER } from '../src/persons/person-filmography-provider';
import { AppModule } from '../src/app.module';
import { SEARCH_PROVIDER } from '../src/search/search-provider';
import { MOVIE_PROVIDER } from '../src/movies/movie-provider';
import { SERIES_PROVIDER, SeriesProvider } from '../src/series/series-provider';
import { minimalSeriesDetails } from './fixtures/series';
import { createApiDocument } from '../src/api-document';
import { RatingsService } from '../src/ratings/ratings.service';
import { DISCOVERY_PROVIDER } from '../src/discovery/discovery.tokens';

describe('Series details API (e2e)', () => {
  let app: INestApplication;
  const provider: jest.Mocked<SeriesProvider> = {
    findPopular: jest.fn(),
    findOne: jest.fn(),
    findCredits: jest.fn(),
    findImages: jest.fn(),
    findVideos: jest.fn(),
    findSeason: jest.fn(),
    findEpisode: jest.fn(),
    findEpisodeCredits: jest.fn(),
    findWatchProviders: jest.fn(),
    findRatings: jest.fn(),
  };
  const movieProvider = {
    findOne: jest.fn(),
    findCredits: jest.fn(),
    findImages: jest.fn(),
    findVideos: jest.fn(),
    findPerson: jest.fn(),
  };

  it('browses paginated Series through the independent provider and documents the response', async () => {
    const response = {
      results: [{ id: 1, mediaType: 'tv' as const, title: 'Popular Series' }],
      page: 2,
      totalPages: 3,
      totalResults: 50,
    };
    provider.findPopular.mockResolvedValue(response);
    await request(app.getHttpServer())
      .get(
        '/api/v1/series?page=2&year=2005&minimumRating=7&sort=title&order=asc',
      )
      .expect(200)
      .expect(response);
    expect(provider.findPopular).toHaveBeenCalledWith({
      page: 2,
      year: 2005,
      minimumRating: 7,
      sort: 'title',
      order: 'asc',
    });
    const document = createApiDocument(app);
    expect(document.paths['/api/v1/series'].get.responses['200']).toMatchObject(
      {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SearchResponseDto' },
          },
        },
      },
    );
    expect(document.components.schemas.EpisodeSummaryDto).toMatchObject({
      properties: { stillSrcSet: { type: 'string' } },
    });
  });

  it('returns unified series ratings and 404 for a confirmed missing series', async () => {
    provider.findRatings!.mockResolvedValue({
      status: 'available',
      score: 8,
      voteCount: 45,
    });
    await request(app.getHttpServer())
      .get('/api/v1/series/1399/ratings')
      .expect(200, {
        tmdb: { status: 'available', score: 8, voteCount: 45 },
        imdb: { status: 'unavailable', reason: 'not-configured' },
      });
    provider.findRatings!.mockResolvedValueOnce(undefined);
    await request(app.getHttpServer())
      .get('/api/v1/series/404/ratings')
      .expect(404);
  });

  it.each([
    'page=0',
    'page=501',
    'page=1.5',
    'year=10000',
    'year=abc',
    'minimumRating=11',
    'minimumRating=-1',
    'sort=bad',
    'order=bad',
  ])('rejects invalid Series listing %s', async (query) => {
    await request(app.getHttpServer())
      .get('/api/v1/series?' + query)
      .expect(400);
    expect(provider.findPopular).not.toHaveBeenCalled();
  });

  it.each([
    '',
    '/1399',
    '/1/seasons/0',
    '/1/seasons/0/episodes/3',
    '/1/seasons/0/episodes/3/credits',
    '/suggestions',
    '/1/recommendations',
  ])('returns 404 for removed TV API route /api/v1/tv%s', async (suffix) => {
    await request(app.getHttpServer())
      .get('/api/v1/tv' + suffix)
      .expect(404);
    expect(provider.findOne).not.toHaveBeenCalled();
    expect(provider.findSeason).not.toHaveBeenCalled();
    expect(provider.findEpisode).not.toHaveBeenCalled();
    expect(provider.findEpisodeCredits).not.toHaveBeenCalled();
  });

  it('serves aggregate credits and documents nested roles and counts', async () => {
    const credits: NonNullable<
      Awaited<ReturnType<SeriesProvider['findCredits']>>
    > = {
      cast: [],
      crew: [],
      sections: {
        cast: { status: 'available' },
        crew: { status: 'available' },
      },
    };
    provider.findCredits.mockResolvedValue(credits);
    await request(app.getHttpServer())
      .get('/api/v1/series/1399/credits')
      .expect(200)
      .expect(credits);
    expect(provider.findCredits).toHaveBeenCalledWith(1399);
    await request(app.getHttpServer())
      .get('/api/v1/series/0/credits')
      .expect(400);
    provider.findCredits.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .get('/api/v1/series/1399/credits')
      .expect(404);
    const document = createApiDocument(app);
    expect(
      document.paths['/api/v1/series/{id}/credits'].get.responses['200'],
    ).toBeDefined();
    expect(document.components.schemas.SeriesCharacterDto).toMatchObject({
      properties: { episodeCount: { nullable: true } },
    });
  });

  it.each(['images', 'videos'] as const)(
    'serves %s with availability and canonical Swagger',
    async (section) => {
      const images = {
        posters: [],
        backdrops: [],
        sections: {
          posters: { status: 'available' as const },
          backdrops: { status: 'available' as const },
        },
      };
      const videos = {
        videos: [],
        availability: { status: 'available' as const },
      };
      provider.findImages.mockResolvedValue(images);
      provider.findVideos.mockResolvedValue(videos);
      await request(app.getHttpServer())
        .get(`/api/v1/series/1/${section}`)
        .expect(200)
        .expect(section === 'images' ? images : videos);
      await request(app.getHttpServer())
        .get(`/api/v1/series/invalid/${section}`)
        .expect(400);
      provider.findImages.mockResolvedValue(undefined);
      provider.findVideos.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .get(`/api/v1/series/1/${section}`)
        .expect(404);
      expect(
        createApiDocument(app).paths[`/api/v1/series/{id}/${section}`].get
          .responses['200'],
      ).toBeDefined();
    },
  );

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERSON_FILMOGRAPHY_PROVIDER)
      .useValue({})
      .overrideProvider(SERIES_PROVIDER)
      .useValue(provider)
      .overrideProvider(SEARCH_PROVIDER)
      .useValue({})
      .overrideProvider(MOVIE_PROVIDER)
      .useValue(movieProvider)
      .overrideProvider(RatingsService)
      .useValue({
        findRatings: (_kind: string, _id: number, tmdb: unknown) => ({
          tmdb,
          imdb: { status: 'unavailable', reason: 'not-configured' },
        }),
      })
      .overrideProvider(DISCOVERY_PROVIDER)
      .useValue({})
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    provider.findOne.mockResolvedValue(minimalSeriesDetails);
    provider.findWatchProviders.mockResolvedValue({ providers: [] });
  });

  it('serves normalized series watch providers on the canonical route', async () => {
    const providers = {
      providers: [
        { id: 8, name: 'Provider', category: 'buy' as const, region: 'HU' },
      ],
    };
    provider.findWatchProviders.mockResolvedValueOnce(providers);
    await request(app.getHttpServer())
      .get('/api/v1/series/1399/watch-providers')
      .expect(200)
      .expect(providers);
    expect(provider.findWatchProviders).toHaveBeenCalledWith(1399);
  });

  it.each(['/api/v1/series'])(
    'serves season 0 and episode/credit routes under %s',
    async (base) => {
      provider.findSeason.mockResolvedValue({
        id: 10,
        seriesId: 1,
        seasonNumber: 0,
        title: 'Specials',
        description: null,
        airDate: null,
        posterUrl: null,
        episodeCount: 0,
        episodes: [],
      });
      const credits = {
        cast: [],
        guestStars: [],
        crew: [],
        sections: {
          cast: { status: 'available' as const },
          guestStars: { status: 'available' as const },
          crew: { status: 'available' as const },
        },
      };
      provider.findEpisode.mockResolvedValue({
        id: 30,
        seriesId: 1,
        seasonNumber: 0,
        episodeNumber: 3,
        title: 'Episode',
        description: null,
        stillUrl: null,
        airDate: null,
        runtimeMinutes: null,
        rating: null,
        voteCount: null,
        credits,
      });
      provider.findEpisodeCredits.mockResolvedValue(credits);

      await request(app.getHttpServer())
        .get(`${base}/1/seasons/0`)
        .expect(200)
        .expect((response) => expect(response.body.episodes).toEqual([]));
      await request(app.getHttpServer())
        .get(`${base}/1/seasons/0/episodes/3`)
        .expect(200);
      await request(app.getHttpServer())
        .get(`${base}/1/seasons/0/episodes/3/credits`)
        .expect(200)
        .expect(credits);
      expect(provider.findSeason).toHaveBeenCalledWith(1, 0);
      expect(provider.findEpisode).toHaveBeenCalledWith(1, 0, 3);
      expect(provider.findEpisodeCredits).toHaveBeenCalledWith(1, 0, 3);
    },
  );

  it.each(['-1', '1.2', '1e2', '+1', ' 1', '9007199254740992', 'abc'])(
    'rejects invalid season/episode coordinate %s before access',
    async (coordinate) => {
      await request(app.getHttpServer())
        .get(`/api/v1/series/1/seasons/${encodeURIComponent(coordinate)}`)
        .expect(400);
      await request(app.getHttpServer())
        .get(
          `/api/v1/series/1/seasons/0/episodes/${encodeURIComponent(coordinate)}`,
        )
        .expect(400);
      expect(provider.findSeason).not.toHaveBeenCalled();
      expect(provider.findEpisode).not.toHaveBeenCalled();
    },
  );

  it('rejects zero episode number and invalid nested IDs', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/series/1/seasons/0/episodes/0')
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/series/0/seasons/0')
      .expect(400);
    expect(provider.findSeason).not.toHaveBeenCalled();
    expect(provider.findEpisode).not.toHaveBeenCalled();
  });

  it.each(['', '/episodes/3', '/episodes/3/credits'])(
    'preserves missing-resource 404 for nested path %s',
    async (suffix) => {
      await request(app.getHttpServer())
        .get('/api/v1/series/1/seasons/0' + suffix)
        .expect(404);
    },
  );

  it.each([502, 504, 429])(
    'preserves nested provider %s errors',
    async (status) => {
      const error = new HttpException(
        {
          statusCode: status,
          message: 'Provider unavailable',
          ...(status === 429 && { retryAfter: 12 }),
        },
        status,
      );
      provider.findSeason.mockRejectedValue(error);
      provider.findEpisode.mockRejectedValue(error);
      provider.findEpisodeCredits.mockRejectedValue(error);
      for (const suffix of ['', '/episodes/3', '/episodes/3/credits']) {
        const response = await request(app.getHttpServer())
          .get('/api/v1/series/1/seasons/0' + suffix)
          .expect(status);

        if (status === 429) {
          expect(response.headers['retry-after']).toBe('12');
        }
      }
    },
  );

  it('documents nested bounds, schemas, availability and canonical route errors', () => {
    const document = createApiDocument(app);
    const season =
      document.paths['/api/v1/series/{id}/seasons/{seasonNumber}'].get;
    const episode =
      document.paths[
        '/api/v1/series/{id}/seasons/{seasonNumber}/episodes/{episodeNumber}'
      ].get;
    expect(season.parameters).toContainEqual(
      expect.objectContaining({
        name: 'seasonNumber',
        schema: expect.objectContaining({
          minimum: 0,
          maximum: Number.MAX_SAFE_INTEGER,
        }),
      }),
    );
    expect(episode.parameters).toContainEqual(
      expect.objectContaining({
        name: 'episodeNumber',
        schema: expect.objectContaining({
          minimum: 1,
          maximum: Number.MAX_SAFE_INTEGER,
        }),
      }),
    );
    expect(Object.keys(episode.responses).sort()).toEqual([
      '200',
      '400',
      '404',
      '429',
      '502',
      '504',
    ]);
    expect(document.components.schemas.SeasonDetailsDto).toMatchObject({
      properties: {
        episodes: {
          type: 'array',
          items: { $ref: '#/components/schemas/EpisodeSummaryDto' },
        },
      },
    });
    expect(document.components.schemas.EpisodeSummaryDto).toMatchObject({
      properties: {
        runtimeMinutes: { nullable: true },
        voteCount: { nullable: true, minimum: 0 },
      },
    });
    expect(document.components.schemas.EpisodeCreditsDto).toBeDefined();
    expect(document.components.schemas.EpisodeCreditSectionsDto).toBeDefined();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns the Series contract through independent dependency injection', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/series/1399')
      .expect(200)
      .expect(minimalSeriesDetails);
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
      .get('/api/v1/series/' + encodeURIComponent(id))
      .expect(400)
      .expect((response) => {
        expect(response.body.statusCode).toBe(400);
        expect(Array.isArray(response.body.message)).toBe(true);
      });
    expect(provider.findOne).not.toHaveBeenCalled();
  });

  it('accepts a maximum safe integer ID', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/series/9007199254740991')
      .expect(200);
    expect(provider.findOne).toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER);
  });

  it('returns the existing error shape for missing series', async () => {
    provider.findOne.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .get('/api/v1/series/1')
      .expect(404)
      .expect({
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
        .get('/api/v1/series/1')
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
      .get('/api/v1/series/1')
      .expect(429)
      .expect('Retry-After', '30');
  });

  it.each(['/api/v1/series/1/recommendations'])(
    'does not expose deferred route %s',
    async (path) => {
      await request(app.getHttpServer()).get(path).expect(404);
      expect(provider.findOne).not.toHaveBeenCalled();
    },
  );

  it('documents nested Series schemas, nullable fields, ID bounds and errors', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Movie Explorer').setVersion('1').build(),
    );
    const operation = document.paths['/api/v1/series/{id}'].get;
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
    expect(schemas.SeriesDetailsDto).toMatchObject({
      required: Object.keys(minimalSeriesDetails),
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
          items: { $ref: '#/components/schemas/SeasonSummaryDto' },
        },
      },
    });
    expect(schemas.SeasonSummaryDto).toMatchObject({
      properties: {
        seasonNumber: { minimum: 0 },
        episodeCount: { nullable: true },
        posterUrl: { nullable: true },
      },
    });
  });
});
