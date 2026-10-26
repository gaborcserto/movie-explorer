import { BadGatewayException } from '@nestjs/common';

import { RatingsService } from './ratings.service';
import { TmdbExternalIds } from '../integrations/tmdb/tmdb-external-ids';
import { OmdbAdapter } from '../integrations/omdb/omdb.adapter';

describe('RatingsService optional data', () => {
  const ids = new TmdbExternalIds();
  const omdb = new OmdbAdapter('test-key');
  const service = new RatingsService(ids, omdb);
  afterEach(() => jest.restoreAllMocks());

  it.each(['movie', 'series'] as const)(
    'returns the %s IMDb rating',
    async (kind) => {
      const resolve = jest.spyOn(ids, 'resolve').mockResolvedValue('tt0133093');
      const find = jest
        .spyOn(omdb, 'findRating')
        .mockResolvedValue({ status: 'available', score: 8.7, voteCount: 100 });
      await expect(service.findImdb(kind, 603)).resolves.toEqual({
        imdb: { score: 8.7, voteCount: 100 },
      });
      expect(resolve).toHaveBeenCalledWith(kind, 603);
      expect(find).toHaveBeenCalledWith('tt0133093', kind);
    },
  );

  it('skips ID resolution when OMDb is disabled', async () => {
    const resolve = jest.spyOn(ids, 'resolve');
    await expect(
      new RatingsService(ids, new OmdbAdapter('')).findImdb('movie', 603),
    ).resolves.toEqual({ imdb: null });
    expect(resolve).not.toHaveBeenCalled();
  });

  it('skips OMDb for a missing ID', async () => {
    jest.spyOn(ids, 'resolve').mockResolvedValue(null);
    const find = jest.spyOn(omdb, 'findRating');
    await expect(service.findImdb('series', 1)).resolves.toEqual({
      imdb: null,
    });
    expect(find).not.toHaveBeenCalled();
  });

  it('isolates TMDB and OMDb failures', async () => {
    jest
      .spyOn(ids, 'resolve')
      .mockRejectedValueOnce(new Error('TMDB'))
      .mockResolvedValue('tt0133093');
    jest.spyOn(omdb, 'findRating').mockRejectedValue(new Error('OMDb'));
    await expect(service.findImdb('movie', 1)).resolves.toEqual({ imdb: null });
    await expect(service.findImdb('movie', 1)).resolves.toEqual({ imdb: null });
  });

  it('combines source outcomes without turning a provider failure into missing data', async () => {
    jest.spyOn(ids, 'resolve').mockResolvedValue('tt0133093');
    jest
      .spyOn(omdb, 'findRating')
      .mockResolvedValue({ status: 'unavailable', reason: 'upstream-error' });
    await expect(
      service.findRatings('movie', 603, {
        status: 'available',
        score: 7.8,
        voteCount: 12500,
      }),
    ).resolves.toEqual({
      tmdb: { status: 'available', score: 7.8, voteCount: 12500 },
      imdb: { status: 'unavailable', reason: 'upstream-error' },
    });
  });

  it('reports an unconfigured OMDb source without attempting ID resolution', async () => {
    const resolve = jest.spyOn(ids, 'resolve');
    await expect(
      new RatingsService(ids, new OmdbAdapter('')).findRatings('series', 1, {
        status: 'missing',
      }),
    ).resolves.toEqual({
      tmdb: { status: 'missing' },
      imdb: { status: 'unavailable', reason: 'not-configured' },
    });
    expect(resolve).not.toHaveBeenCalled();
  });

  it('classifies malformed external ID responses separately from upstream failures', async () => {
    jest
      .spyOn(ids, 'resolve')
      .mockRejectedValue(
        new BadGatewayException('Movie provider response was invalid'),
      );

    await expect(
      service.findRatings('movie', 603, { status: 'missing' }),
    ).resolves.toEqual({
      tmdb: { status: 'missing' },
      imdb: { status: 'unavailable', reason: 'invalid-response' },
    });
  });
});
