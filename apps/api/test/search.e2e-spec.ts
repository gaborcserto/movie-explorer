import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { MOVIE_PROVIDER } from '../src/movies/movie-provider';
import { SERIES_PROVIDER } from '../src/series/series-provider';
import { PERSON_FILMOGRAPHY_PROVIDER } from '../src/persons/person-filmography-provider';
import { SEARCH_PROVIDER } from '../src/search/search-provider';
import { createApiDocument } from '../src/api-document';

describe('Unified Search API', () => {
  let app: INestApplication;
  const provider = { find: jest.fn() };
  const legacy = { findSuggestions: jest.fn(), findPeople: jest.fn() };
  const envelope = { results: [], page: 1, totalPages: 0, totalResults: 0 };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MOVIE_PROVIDER)
      .useValue(legacy)
      .overrideProvider(SERIES_PROVIDER)
      .useValue({})
      .overrideProvider(PERSON_FILMOGRAPHY_PROVIDER)
      .useValue({})
      .overrideProvider(SEARCH_PROVIDER)
      .useValue(provider)
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    provider.find.mockResolvedValue(envelope);
    legacy.findSuggestions.mockResolvedValue({
      suggestions: [{ id: 1, title: 'Movie' }],
    });
    legacy.findPeople.mockResolvedValue({
      people: [{ id: 1, name: 'Person' }],
    });
  });
  afterAll(() => app.close());

  it.each(['all', 'movie', 'tv', 'person'])(
    'searches %s with the exact page',
    async (type) => {
      await request(app.getHttpServer())
        .get(`/api/v1/search?query=%20Query%20&type=${type}&page=500`)
        .expect(200)
        .expect(envelope);
      expect(provider.find).toHaveBeenCalledWith('Query', type, 500, undefined);
      expect(legacy.findSuggestions).not.toHaveBeenCalled();
    },
  );
  it('defaults to All and accepts a single character query', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/search?query=A')
      .expect(200);
    expect(provider.find).toHaveBeenCalledWith('A', 'all', 1, undefined);
  });
  it.each([
    '',
    '?query=',
    '?query=%20',
    '?query=A&type=series',
    '?query=A&page=0',
    '?query=A&page=501',
    '?query=A&page=1.5',
    '?query=A&page=no',
    '?query=A&year=2000',
    '?query=A&type=person&year=2000',
    '?query=A&type=tv&year=abc',
    '?query=A&type=tv&year=10000',
    '?query=A&sort=popularity',
    '?query=A&genre=drama',
  ])(
    'rejects invalid or unsupported query %s before upstream calls',
    async (query) => {
      await request(app.getHttpServer())
        .get('/api/v1/search' + query)
        .expect(400);
      expect(provider.find).not.toHaveBeenCalled();
    },
  );
  it('passes Series first-air year', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/search?query=A&type=tv&year=2005')
      .expect(200);
    expect(provider.find).toHaveBeenCalledWith('A', 'tv', 1, 2005);
  });
  it('preserves legacy autocomplete by default and opts into Series without ID collisions', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/search/suggestions?query=Query')
      .expect(200)
      .expect(({ body }) => {
        expect(
          body.suggestions.map((item: { mediaType: string }) => item.mediaType),
        ).toEqual(['movie', 'person']);
      });
    expect(provider.find).not.toHaveBeenCalled();
    provider.find.mockResolvedValue({
      ...envelope,
      results: [{ id: 1, mediaType: 'tv', title: 'Series' }],
    });
    await request(app.getHttpServer())
      .get('/api/v1/search/suggestions?query=Query&includeSeries=true&limit=1')
      .expect(200)
      .expect(({ body }) => {
        expect(
          body.suggestions.map((item: { mediaType: string }) => item.mediaType),
        ).toEqual(['movie', 'tv', 'person']);
        expect(body.groups.tv.status).toBe('available');
      });
    expect(provider.find).toHaveBeenCalledWith('Query', 'tv', 1);
  });
  it('retains successful suggestions when Series fails', async () => {
    provider.find.mockRejectedValue(new BadGatewayException());
    await request(app.getHttpServer())
      .get('/api/v1/search/suggestions?query=Query&includeSeries=true')
      .expect(200)
      .expect(({ body }) => {
        expect(body.groups.tv.status).toBe('unavailable');
        expect(body.suggestions).toHaveLength(2);
      });
  });
  it.each(['yes', '1', ''])(
    'rejects invalid includeSeries=%s',
    async (value) => {
      await request(app.getHttpServer())
        .get('/api/v1/search/suggestions?query=Query&includeSeries=' + value)
        .expect(400);
    },
  );
  it.each([
    new BadGatewayException(),
    new GatewayTimeoutException(),
    new HttpException('Rate limited', 429),
  ])('preserves classified provider errors', async (error) => {
    provider.find.mockRejectedValue(error);
    await request(app.getHttpServer())
      .get('/api/v1/search?query=Query')
      .expect(error.getStatus());
  });
  it('documents the discriminated nested schemas and actual query parameters', () => {
    const doc = createApiDocument(app);
    const operation = doc.paths['/api/v1/search'].get;
    expect(
      operation.parameters.map((param) => 'name' in param && param.name),
    ).toEqual(expect.arrayContaining(['query', 'type', 'page', 'year']));
    const schema = doc.components.schemas.SearchResponseDto;
    expect(schema).toMatchObject({
      properties: {
        results: {
          items: {
            discriminator: { propertyName: 'mediaType' },
            oneOf: expect.any(Array),
          },
        },
      },
    });
    expect(
      doc.paths['/api/v1/search/suggestions'].get.responses['200'],
    ).toBeDefined();
  });
});
