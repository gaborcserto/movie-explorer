import { Test, TestingModule } from '@nestjs/testing';
import {
  BadGatewayException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { MovieProvider } from '../src/movies/movie-provider';
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

const movieProvider: jest.Mocked<MovieProvider> = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  findSuggestions: jest.fn(),
  findPerson: jest.fn(),
  findPeople: jest.fn(),
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
    jest.clearAllMocks();
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
        suggestions: [
          { mediaType: 'movie', id: 5, title: 'Movie' },
          { mediaType: 'person', id: 5, name: 'Person' },
        ],
      });
    expect(movieProvider.findPeople).toHaveBeenCalledWith('Query', 1);
    await request(app.getHttpServer())
      .get('/movies/suggestions?query=Query')
      .expect(200)
      .expect({ suggestions: [{ id: 5, title: 'Movie' }] });
  });

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
      '',
      'query=%20%20',
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
      '502',
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
