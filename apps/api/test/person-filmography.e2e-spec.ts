import { ok } from 'node:assert/strict';
import {
  BadGatewayException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { SEARCH_PROVIDER } from '../src/search/search-provider';
import { MOVIE_PROVIDER } from '../src/movies/movie-provider';
import { SERIES_PROVIDER } from '../src/series/series-provider';
import { PERSON_FILMOGRAPHY_PROVIDER } from '../src/persons/person-filmography-provider';
import { createApiDocument } from '../src/api-document';
import { DISCOVERY_PROVIDER } from '../src/discovery/discovery.tokens';

describe('Person combined filmography API', () => {
  let app: INestApplication;
  const legacy = { findPerson: jest.fn(), findFilmography: jest.fn() };
  const combined = { findPerson: jest.fn(), findCombined: jest.fn() };
  const envelope = {
    entries: [],
    groups: { movie: { status: 'available' }, tv: { status: 'available' } },
  };
  const profile = { id: 1, name: 'Person', filmography: [] };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SEARCH_PROVIDER)
      .useValue({})
      .overrideProvider(MOVIE_PROVIDER)
      .useValue(legacy)
      .overrideProvider(SERIES_PROVIDER)
      .useValue({})
      .overrideProvider(PERSON_FILMOGRAPHY_PROVIDER)
      .useValue(combined)
      .overrideProvider(DISCOVERY_PROVIDER)
      .useValue({})
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    legacy.findPerson.mockResolvedValue(profile);
    legacy.findFilmography.mockResolvedValue({ filmography: [] });
    combined.findPerson.mockResolvedValue({
      ...profile,
      combinedFilmography: envelope,
    });
    combined.findCombined.mockResolvedValue(envelope);
  });
  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('keeps default profile and filmography consumers movie-only', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/persons/1')
      .expect(200)
      .expect(profile);
    await request(app.getHttpServer())
      .get('/api/v1/persons/1/filmography')
      .expect(200)
      .expect({ filmography: [] });
    expect(combined.findPerson).not.toHaveBeenCalled();
    expect(combined.findCombined).not.toHaveBeenCalled();
  });

  it('opts in without duplicating legacy requests', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/persons/1?include=combinedFilmography')
      .expect(200)
      .expect({ ...profile, combinedFilmography: envelope });
    expect(combined.findPerson).toHaveBeenCalledWith(1);
    expect(legacy.findPerson).not.toHaveBeenCalled();
  });

  it.each(['all', 'movie', 'tv'])(
    'passes the exact requested recovery scope %s',
    async (scope) => {
      await request(app.getHttpServer())
        .get(`/api/v1/persons/1/combined-filmography?mediaType=${scope}`)
        .expect(200)
        .expect(envelope);
      expect(combined.findCombined).toHaveBeenCalledWith(1, scope);
      expect(legacy.findFilmography).not.toHaveBeenCalled();
    },
  );

  it('defaults recovery scope to all', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/persons/1/combined-filmography')
      .expect(200);
    expect(combined.findCombined).toHaveBeenCalledWith(1, 'all');
  });

  it.each([
    '/1?include=tv',
    '/1?include=combinedFilmography&include=combinedFilmography',
    '/1/combined-filmography?mediaType=series',
    '/0/combined-filmography',
    '/1/combined-filmography?mediaType=tv&mediaType=movie',
  ])(
    'validates query and identity before provider calls: %s',
    async (suffix) => {
      await request(app.getHttpServer())
        .get('/api/v1/persons' + suffix)
        .expect(400);
      expect(combined.findPerson).not.toHaveBeenCalled();
      expect(combined.findCombined).not.toHaveBeenCalled();
    },
  );

  it('preserves 404 and classified provider failures', async () => {
    combined.findCombined.mockResolvedValueOnce(undefined);
    await request(app.getHttpServer())
      .get('/api/v1/persons/1/combined-filmography')
      .expect(404);
    combined.findCombined.mockRejectedValueOnce(
      new BadGatewayException('Provider failure'),
    );
    await request(app.getHttpServer())
      .get('/api/v1/persons/1/combined-filmography')
      .expect(502);
  });

  it('documents opt-in, scoped availability, discriminated entries and nullable participation counts', () => {
    const doc = createApiDocument(app);
    ok(doc.paths['/api/v1/persons/{id}'].get);
    expect(doc.paths['/api/v1/persons/{id}'].get.parameters).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'include' })]),
    );
    ok(doc.paths['/api/v1/persons/{id}/combined-filmography'].get);
    expect(
      doc.paths['/api/v1/persons/{id}/combined-filmography'].get.parameters,
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'mediaType' })]),
    );
    ok(doc.components);
    ok(doc.components.schemas);
    expect(doc.components.schemas.CombinedFilmographyDto).toMatchObject({
      properties: {
        entries: { items: { discriminator: { propertyName: 'mediaType' } } },
      },
    });

    expect(doc.components.schemas.PersonActingRoleDto).toMatchObject({
      properties: { episodeCount: { nullable: true } },
    });

    expect(doc.components.schemas.PersonSeriesCreditDto).toMatchObject({
      properties: { firstAirDate: { nullable: true } },
    });
  });
});
