import { Test, TestingModule } from '@nestjs/testing';
import {
  BadGatewayException,
  HttpException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as request from 'supertest';

import type { MovieProvider } from '../src/movies/movie-provider';
import { PERSON_FILMOGRAPHY_PROVIDER } from '../src/persons/person-filmography-provider';
import { AppModule } from './../src/app.module';
import { MOVIE_PROVIDER } from './../src/movies/movie-provider';
import { SERIES_PROVIDER } from '../src/series/series-provider';
import { createApiDocument } from '../src/api-document';
import { SEARCH_PROVIDER } from '../src/search/search-provider';
import { RatingsService } from '../src/ratings/ratings.service';

const movies = [
  {
    id: 269149,
    title: 'Zootopia',
    releaseDate: '2016-02-11',
    posterUrl: 'https://example.com/posters/zootopia.jpg',
    genres: ['Animation', 'Adventure', 'Family', 'Comedy'],
  },
];

const movieProvider: jest.Mocked<MovieProvider> = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  findSuggestions: jest.fn(),
  findPerson: jest.fn(),
  findPeople: jest.fn(),
  findMovieSection: jest.fn(),
  findFilmography: jest.fn(),
  findWatchProviders: jest.fn(),
  findRatings: jest.fn(),
};

describe('AppController (e2e)', () => {
  let app: INestApplication;

  it.each([
    '',
    '/1',
    '/suggestions?query=Alien',
    '/1/credits',
    '/1/photos',
    '/1/posters',
    '/1/videos',
  ])('returns 404 for removed movie route /movies%s', async (suffix) => {
    await request(app.getHttpServer())
      .get('/movies' + suffix)
      .expect(404);
    expect(movieProvider.findAll).not.toHaveBeenCalled();
    expect(movieProvider.findOne).not.toHaveBeenCalled();
    expect(movieProvider.findSuggestions).not.toHaveBeenCalled();
    expect(movieProvider.findMovieSection).not.toHaveBeenCalled();
  });

  it('serves movie ratings through the unified contract and documents outcome variants', async () => {
    const tmdb = { status: 'available', score: 7.8, voteCount: 12500 } as const;
    const ratings = { tmdb, imdb: { status: 'missing' } };
    movieProvider.findRatings.mockResolvedValue(tmdb);
    await request(app.getHttpServer())
      .get('/api/v1/movies/269149/ratings')
      .expect(200, ratings);
    const document = createApiDocument(app);
    const successResponse =
      document.paths['/api/v1/movies/{id}/ratings'].get.responses['200'];
    expect(JSON.stringify(successResponse)).toContain(
      '#/components/schemas/RatingsDto',
    );
    expect(document.components.schemas.AvailableRatingDto).toBeDefined();
    expect(document.components.schemas.MissingRatingDto).toBeDefined();
    expect(document.components.schemas.UnavailableRatingDto).toBeDefined();
  });

  it('documents only canonical operations with unique IDs and current schemas', () => {
    const document = createApiDocument(app);
    const expectedPaths = [
      '/api/v1/ratings/{mediaType}/{id}/imdb',
      '/api/v1/movies',
      '/api/v1/movies/suggestions',
      '/api/v1/movies/{id}',
      '/api/v1/movies/{id}/watch-providers',
      '/api/v1/movies/{id}/ratings',
      ...['credits', 'photos', 'posters', 'videos'].map(
        (section) => '/api/v1/movies/{id}/' + section,
      ),
      '/api/v1/persons',
      '/api/v1/persons/{id}',
      '/api/v1/persons/{id}/filmography',
      '/api/v1/persons/{id}/combined-filmography',
      '/api/v1/search/suggestions',
      '/api/v1/search',
      '/api/v1/series',
      '/api/v1/series/{id}',
      '/api/v1/series/{id}/credits',
      '/api/v1/series/{id}/images',
      '/api/v1/series/{id}/videos',
      '/api/v1/series/{id}/watch-providers',
      '/api/v1/series/{id}/ratings',
      '/api/v1/series/{id}/seasons/{seasonNumber}',
      '/api/v1/series/{id}/seasons/{seasonNumber}/episodes/{episodeNumber}',
      '/api/v1/series/{id}/seasons/{seasonNumber}/episodes/{episodeNumber}/credits',
    ];
    expect(Object.keys(document.paths).sort()).toEqual(expectedPaths.sort());
    const operations = Object.values(document.paths).map((item) => item.get);
    for (const operation of operations) {
      expect(operation).toBeDefined();
      expect(operation.deprecated).not.toBe(true);
      expect(operation.operationId).toBeTruthy();
      expect(operation.operationId).not.toMatch(/Tv|legacy/);
    }
    const ids = operations.map((operation) => operation.operationId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(operations.flatMap((operation) => operation.tags))).toEqual(
      new Set(['Movies', 'Series', 'Persons', 'Search', 'Ratings']),
    );
    expect(
      Object.keys(document.components.schemas).filter((name) =>
        name.startsWith('Tv'),
      ),
    ).toEqual([]);
    expect(document.paths['/api/v1/series/{id}'].get.operationId).toBe(
      'SeriesController_getSeries',
    );
  });

  it.each(['', '/269149', '/suggestions?query=Alien'])(
    'serves canonical movie responses at %s',
    async (suffix) => {
      await request(app.getHttpServer())
        .get('/api/v1/movies' + suffix)
        .expect(200);
      if (suffix.startsWith('/suggestions')) {
        expect(movieProvider.findSuggestions).toHaveBeenCalledWith('Alien', 6);
        expect(movieProvider.findOne).not.toHaveBeenCalled();
      }
    },
  );

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SEARCH_PROVIDER)
      .useValue({})
      .overrideProvider(MOVIE_PROVIDER)
      .useValue(movieProvider)
      .overrideProvider(PERSON_FILMOGRAPHY_PROVIDER)
      .useValue({})
      .overrideProvider(SERIES_PROVIDER)
      .useValue({ findOne: jest.fn() })
      .overrideProvider(RatingsService)
      .useValue({
        findRatings: (_kind: string, _id: number, tmdb: unknown) => ({
          tmdb,
          imdb: { status: 'missing' },
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    movieProvider.findWatchProviders.mockResolvedValue({ providers: [] });
    movieProvider.findPerson.mockResolvedValue({
      id: 1,
      name: 'Person',
      filmography: [],
    });
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

  it.each([
    '1e3',
    '0x10',
    '-1',
    '1.5',
    '0',
    '9007199254740992',
    ' 42',
    '42 ',
    '+42',
  ])('rejects invalid detail ID %s before calling the provider', async (id) => {
    for (const base of ['/api/v1/movies', '/api/v1/persons']) {
      await request(app.getHttpServer())
        .get(base + '/' + encodeURIComponent(id))
        .expect(400)
        .expect((response) => {
          expect(response.body.statusCode).toBe(400);
          expect(Array.isArray(response.body.message)).toBe(true);
        });
    }
    expect(movieProvider.findOne).not.toHaveBeenCalled();
    expect(movieProvider.findPerson).not.toHaveBeenCalled();
  });

  it.each(['1', '00042', '9007199254740991'])(
    'accepts safe positive decimal detail ID %s',
    async (id) => {
      await request(app.getHttpServer())
        .get('/api/v1/movies/' + id)
        .expect(200);
      await request(app.getHttpServer())
        .get('/api/v1/persons/' + id)
        .expect(200);

      expect(movieProvider.findOne).toHaveBeenCalledWith(Number(id));
      expect(movieProvider.findPerson).toHaveBeenCalledWith(Number(id));
    },
  );

  it('preserves a safe rate-limit delay in the public body and header', async () => {
    movieProvider.findOne.mockRejectedValueOnce(
      new HttpException(
        {
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Movie provider rate limit reached',
          retryAfter: 15,
        },
        429,
      ),
    );

    await request(app.getHttpServer())
      .get('/api/v1/movies/1')
      .expect(429)
      .expect('Retry-After', '15')
      .expect({
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Movie provider rate limit reached',
        retryAfter: 15,
      });
  });

  it.each([429, 502, 504])(
    'preserves public error status %s',
    async (status) => {
      movieProvider.findOne.mockRejectedValueOnce(
        new HttpException(
          { statusCode: status, message: 'Safe provider failure' },
          status,
        ),
      );

      await request(app.getHttpServer())
        .get('/api/v1/movies/1')
        .expect(status)
        .expect({ statusCode: status, message: 'Safe provider failure' });
    },
  );

  it.each(['credits', 'photos', 'posters', 'videos'] as const)(
    'serves localized movie %s recovery and validates IDs',
    async (section) => {
      const body =
        section === 'credits'
          ? { cast: ['Recovered actor'] }
          : { [section === 'photos' ? 'backdrops' : section]: [] };
      movieProvider.findMovieSection.mockResolvedValueOnce(body);

      await request(app.getHttpServer())
        .get(`/api/v1/movies/42/${section}`)
        .expect(200)
        .expect(body);
      expect(movieProvider.findMovieSection).toHaveBeenCalledWith(42, section);

      await request(app.getHttpServer())
        .get(`/api/v1/movies/0/${section}`)
        .expect(400);
      expect(movieProvider.findMovieSection).toHaveBeenCalledTimes(1);
    },
  );

  it('serves localized filmography recovery without loading a profile', async () => {
    movieProvider.findFilmography.mockResolvedValueOnce({ filmography: [] });

    await request(app.getHttpServer())
      .get('/api/v1/persons/42/filmography')
      .expect(200)
      .expect({ filmography: [] });
    expect(movieProvider.findFilmography).toHaveBeenCalledWith(42);
    expect(movieProvider.findPerson).not.toHaveBeenCalled();

    await request(app.getHttpServer())
      .get('/api/v1/persons/0/filmography')
      .expect(400);
  });

  it('returns categorized media and metadata without truncating public contracts', async () => {
    const image = {
      filePath: '/image.jpg',
      width: 1000,
      height: 1500,
      aspectRatio: 0.667,
      language: null,
      thumbnailUrl: 'https://example.com/w500/image.jpg',
      fullUrl: 'https://example.com/original/image.jpg',
    };
    const movie = {
      ...movies[0],
      cast: [],
      backdrops: [image],
      posters: Array.from({ length: 9 }, (_, i) => ({
        ...image,
        filePath: `/poster-${i}.jpg`,
      })),
      videos: [
        {
          id: 'video-id',
          key: 'dQw4w9WgXcQ',
          site: 'YouTube',
          type: 'Teaser',
          language: 'hu',
          name: 'Official teaser',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        },
      ],
      sections: {
        credits: { status: 'available' as const },
        photos: { status: 'available' as const },
        posters: { status: 'available' as const },
        videos: { status: 'available' as const },
      },
    };
    movieProvider.findOne.mockResolvedValueOnce(movie);

    await request(app.getHttpServer())
      .get('/api/v1/movies/269149')
      .expect(200)
      .expect(movie);
  });

  it('returns successful HTTP responses with explicit unavailable sections', async () => {
    const movie = {
      ...movies[0],
      cast: [],
      sections: {
        credits: { status: 'unavailable' as const },
        videos: { status: 'available' as const },
        photos: { status: 'unavailable' as const },
      },
    };
    movieProvider.findOne.mockResolvedValueOnce(movie);

    await request(app.getHttpServer())
      .get('/api/v1/movies/1')
      .expect(200)
      .expect(movie);
    const person = {
      id: 1,
      name: 'Person',
      biography: 'Biography',
      filmography: [],
      filmographyAvailability: { status: 'unavailable' as const },
    };
    movieProvider.findPerson.mockResolvedValueOnce(person);

    await request(app.getHttpServer())
      .get('/api/v1/persons/1')
      .expect(200)
      .expect(person);
  });

  it('serves normalized movie watch providers on the canonical route', async () => {
    const providers = {
      providers: [
        { id: 8, name: 'Provider', category: 'rent' as const, region: 'HU' },
      ],
    };
    movieProvider.findWatchProviders.mockResolvedValueOnce(providers);
    await request(app.getHttpServer())
      .get('/api/v1/movies/1/watch-providers')
      .expect(200)
      .expect(providers);
    expect(movieProvider.findWatchProviders).toHaveBeenCalledWith(1);
  });

  it('returns a successful empty autocomplete group alongside an unavailable group', async () => {
    movieProvider.findSuggestions.mockResolvedValueOnce({ suggestions: [] });
    movieProvider.findPeople.mockRejectedValueOnce(
      new HttpException('Safe failure', 502),
    );

    await request(app.getHttpServer())
      .get('/api/v1/search/suggestions?query=Query')
      .expect(200)
      .expect({
        suggestions: [],
        groups: {
          movie: { status: 'available' },
          person: { status: 'unavailable' },
        },
      });
  });

  it('returns unified suggestions without changing movie-only consumers', async () => {
    movieProvider.findPeople.mockResolvedValueOnce({
      people: [{ id: 5, name: 'Person' }],
      page: 1,
      totalPages: 1,
      totalResults: 1,
    });
    movieProvider.findSuggestions.mockResolvedValue({
      suggestions: [{ id: 5, title: 'Movie' }],
    });

    await request(app.getHttpServer())
      .get('/api/v1/search/suggestions?query=Query&limit=2')
      .expect(200)
      .expect({
        groups: {
          movie: { status: 'available' },
          person: { status: 'available' },
        },
        suggestions: [
          { mediaType: 'movie', id: 5, title: 'Movie' },
          { mediaType: 'person', id: 5, name: 'Person' },
        ],
      });
    expect(movieProvider.findPeople).toHaveBeenCalledWith('Query', 1);

    await request(app.getHttpServer())
      .get('/api/v1/movies/suggestions?query=Query')
      .expect(200)
      .expect({ suggestions: [{ id: 5, title: 'Movie' }] });
  });

  it.each(['', '?query=%20%20', '?page=2'])(
    'browses popular persons without a name (%s)',
    async (suffix) => {
      const page = suffix === '?page=2' ? 2 : 1;
      const result = {
        people: [{ id: 7, name: 'Popular person' }],
        page,
        totalPages: 2,
        totalResults: 30,
      };
      movieProvider.findPeople.mockResolvedValueOnce(result);
      await request(app.getHttpServer())
        .get('/api/v1/persons' + suffix)
        .expect(200)
        .expect(result);
      expect(movieProvider.findPeople).toHaveBeenCalledWith('', page);
      const document = createApiDocument(app);
      expect(document.components.schemas.PersonListResponseDto).toBeDefined();
    },
  );

  it('searches person pages and validates query/page/limit bounds', async () => {
    const result = {
      people: [{ id: 7, name: 'Person' }],
      page: 2,
      totalPages: 2,
      totalResults: 21,
    };
    movieProvider.findPeople.mockResolvedValueOnce(result);

    await request(app.getHttpServer())
      .get('/api/v1/persons?query=Person&page=2')
      .expect(200)
      .expect(result);
    expect(movieProvider.findPeople).toHaveBeenCalledWith('Person', 2);

    for (const query of [
      'query=' + 'x'.repeat(101),
      'query=Person&page=0',
      'query=Person&page=501',
      'query=Person&page=1.5',
    ]) {
      await request(app.getHttpServer())
        .get('/api/v1/persons?' + query)
        .expect(400);
    }

    for (const query of [
      'query=x',
      'query=Query&limit=0',
      'query=Query&limit=11',
    ]) {
      await request(app.getHttpServer())
        .get('/api/v1/search/suggestions?' + query)
        .expect(400);
    }
  });

  it('/api/v1/movies (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/movies')
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

  it('returns a person and normalized filmography from the provider', async () => {
    const person = {
      id: 1,
      name: 'Person',
      birthday: '1970-01-02',
      filmography: [
        {
          ...movies[0],
          actingCredits: ['Hero'],
          crewCredits: [{ department: 'Directing', job: 'Director' }],
        },
      ],
    };
    movieProvider.findPerson.mockResolvedValueOnce(person);
    await request(app.getHttpServer())
      .get('/api/v1/persons/1')
      .expect(200)
      .expect(person);
    expect(movieProvider.findPerson).toHaveBeenCalledWith(1);
  });

  it.each(['0', '-1', '1.5', 'abc', '1e3', '0x10', '9007199254740992'])(
    'rejects invalid person ID %s before provider lookup',
    async (id) => {
      await request(app.getHttpServer())
        .get(`/api/v1/persons/${id}`)
        .expect(400);
      expect(movieProvider.findPerson).not.toHaveBeenCalled();
    },
  );

  it('returns 404 for missing persons', async () => {
    movieProvider.findPerson.mockResolvedValueOnce(undefined);
    await request(app.getHttpServer())
      .get('/api/v1/persons/999')
      .expect(404)
      .expect((response) => {
        expect(response.body.message).toBe('Person not found');
      });
  });

  it('returns a sanitized 502 provider failure', async () => {
    movieProvider.findPerson.mockRejectedValueOnce(
      new BadGatewayException('Movie provider request failed'),
    );
    await request(app.getHttpServer())
      .get('/api/v1/persons/1')
      .expect(502)
      .expect((response) => {
        expect(response.body).toEqual({
          statusCode: 502,
          error: 'Bad Gateway',
          message: 'Movie provider request failed',
        });
      });
  });

  it('documents person validation, response statuses, and explicit nested person and movie schemas', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Test API').setVersion('1').build(),
    );
    const operation = document.paths['/api/v1/persons/{id}'].get;
    expect(Object.keys(operation.responses)).toEqual([
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
        required: true,
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: Number.MAX_SAFE_INTEGER,
        },
      }),
    );
    const schemas = document.components.schemas;
    expect(schemas.PersonDetailsDto).toMatchObject({
      required: ['id', 'name', 'filmography'],
      properties: {
        filmography: {
          type: 'array',
          items: { $ref: '#/components/schemas/PersonFilmographyEntryDto' },
        },
        birthday: { type: 'string', format: 'date' },
      },
    });
    expect(schemas.PersonFilmographyEntryDto).toMatchObject({
      properties: {
        actingCredits: { type: 'array', items: { type: 'string' } },
        crewCredits: {
          type: 'array',
          items: { $ref: '#/components/schemas/PersonCrewCreditDto' },
        },
      },
    });
    expect(schemas.PersonCrewCreditDto).toMatchObject({
      properties: { department: { type: 'string' }, job: { type: 'string' } },
    });
    expect(schemas.MovieDetails).toMatchObject({
      properties: {
        originalTitle: { type: 'string' },
        status: { type: 'string' },
        originalLanguage: { type: 'string' },
        budget: { type: 'number', minimum: 0 },
        revenue: { type: 'number', minimum: 0 },
        castMembers: {
          type: 'array',
          items: { $ref: '#/components/schemas/MovieCastMemberDto' },
        },
        directors: {
          type: 'array',
          items: { $ref: '#/components/schemas/MovieDirectorDto' },
        },
      },
    });
    expect(schemas.MovieCastMemberDto).toMatchObject({
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        character: { type: 'string' },
        profileSrcSet: { type: 'string' },
      },
    });
    expect(schemas.MovieDirectorDto).toMatchObject({
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        profileUrl: { type: 'string' },
      },
    });
  });

  it('/api/v1/movies/:id (GET)', async () => {
    const moviesResponse = await request(app.getHttpServer())
      .get('/api/v1/movies')
      .expect(200);

    const movieId = moviesResponse.body.movies[0].id;

    return request(app.getHttpServer())
      .get(`/api/v1/movies/${movieId}`)
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

  it('returns metadata and the complete cast contract without truncation', async () => {
    const castMembers = Array.from({ length: 25 }, (_, index) => ({
      id: index + 1,
      name: `Actor ${index}`,
      character: `Character ${index}`,
    }));
    const details = {
      ...movies[0],
      originalTitle: 'Original Ă˘â‚¬â€ť Title',
      status: 'Released',
      originalLanguage: 'en',
      budget: 225000000,
      revenue: 2512865567,
      cast: castMembers.map((person) => person.name),
      castMembers,
      writers: [{ id: 40, name: 'Writer', roles: ['Screenplay', 'Story'] }],
      producers: [{ id: 41, name: 'Producer', roles: ['Executive Producer'] }],
    };
    movieProvider.findOne.mockResolvedValueOnce(details);
    await request(app.getHttpServer())
      .get(`/api/v1/movies/${details.id}`)
      .expect(200)
      .expect(details);
  });

  it('/api/v1/movies (GET) supports search, filters, and pagination parameters', () => {
    movieProvider.findAll.mockResolvedValueOnce({
      movies,
      page: 2,
      totalPages: 2,
      totalResults: 21,
    });

    return request(app.getHttpServer())
      .get('/api/v1/movies')
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

  it('/api/v1/movies (GET) supports explicit popularity direction', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/movies')
      .query({ sort: 'popularity', sortOrder: 'asc' })
      .expect(200);

    expect(movieProvider.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sort: 'popularity',
        sortOrder: 'asc',
      }),
    );
  });

  it('/api/v1/movies (GET) rejects invalid query parameters', () => {
    return request(app.getHttpServer())
      .get('/api/v1/movies')
      .query({ sort: 'unknown' })
      .expect(400);
  });

  it('/api/v1/movies/suggestions (GET) validates and forwards compact searches', async () => {
    movieProvider.findSuggestions.mockResolvedValueOnce({
      suggestions: [{ id: 269149, title: 'Zootopia', releaseYear: 2016 }],
    });

    await request(app.getHttpServer())
      .get('/api/v1/movies/suggestions')
      .query({ query: 'Zoo', limit: 5 })
      .expect(200)
      .expect({
        suggestions: [{ id: 269149, title: 'Zootopia', releaseYear: 2016 }],
      });
    expect(movieProvider.findSuggestions).toHaveBeenCalledWith('Zoo', 5);

    await request(app.getHttpServer())
      .get('/api/v1/movies/suggestions')
      .query({ query: 'Z' })
      .expect(400);
  });

  it('/api/v1/movies/:id (GET) returns 404 when the provider cannot find the movie', () => {
    movieProvider.findOne.mockResolvedValueOnce(undefined);

    return request(app.getHttpServer())
      .get('/api/v1/movies/999')
      .expect(404)
      .expect((response) => {
        expect(response.body.message).toBe('Movie not found');
      });
  });

  it('/api/v1/movies/:id (GET) rejects non-numeric IDs', () => {
    return request(app.getHttpServer())
      .get('/api/v1/movies/not-a-number')
      .expect(400);
  });

  it('does not expose movie mutation endpoints', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/movies')
      .send({})
      .expect(404);
    await request(app.getHttpServer())
      .put('/api/v1/movies')
      .send({})
      .expect(404);
    await request(app.getHttpServer()).delete('/api/v1/movies/1').expect(404);
  });
});
