import { ok } from 'node:assert/strict';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { RatingsModule } from '../src/ratings/ratings.module';
import { TmdbExternalIds } from '../src/integrations/tmdb/tmdb-external-ids';
import { OmdbAdapter } from '../src/integrations/omdb/omdb.adapter';
import { createApiDocument } from '../src/api-document';

describe('Optional IMDb rating API', () => {
  let app: INestApplication;
  const resolve = jest.fn();
  const findRating = jest.fn();
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [RatingsModule] })
      .overrideProvider(TmdbExternalIds)
      .useValue({ resolve })
      .overrideProvider(OmdbAdapter)
      .useValue({ enabled: true, findRating })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });
  beforeEach(() => {
    resolve.mockReset();
    findRating.mockReset();
  });
  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it.each(['movie', 'series'])(
    'serves the normalized %s contract',
    async (kind) => {
      resolve.mockResolvedValue('tt0133093');
      findRating.mockResolvedValue({
        status: 'available',
        score: 8.7,
        voteCount: 100,
      });
      await request(app.getHttpServer())
        .get(`/api/v1/ratings/${kind}/603/imdb`)
        .expect(200, { imdb: { score: 8.7, voteCount: 100 } });
      expect(resolve).toHaveBeenCalledWith(kind, 603);
    },
  );

  it.each([
    'movie/0',
    'movie/-1',
    'movie/1.5',
    'movie/9007199254740992',
    'tv/1',
    'person/1',
  ])('rejects invalid coordinates %s', async (coordinates) => {
    await request(app.getHttpServer())
      .get(`/api/v1/ratings/${coordinates}/imdb`)
      .expect(400);
    expect(resolve).not.toHaveBeenCalled();
  });

  it('returns optional null rather than failing on upstream errors', async () => {
    resolve.mockRejectedValue(new Error('upstream'));
    await request(app.getHttpServer())
      .get('/api/v1/ratings/movie/603/imdb')
      .expect(200, { imdb: null });
  });

  it('documents the endpoint and nullable rating', () => {
    const document = createApiDocument(app);
    ok(document.paths['/api/v1/ratings/{mediaType}/{id}/imdb'].get);
    expect(
      document.paths['/api/v1/ratings/{mediaType}/{id}/imdb'].get.responses[
        '200'
      ],
    ).toBeDefined();
    ok(document.components);
    ok(document.components.schemas);
    expect(document.components.schemas.ImdbRatingResponseDto).toMatchObject({
      properties: { imdb: { nullable: true } },
    });
  });
});
