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
        .mockResolvedValue({ score: 8.7, voteCount: 100 });
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
});
