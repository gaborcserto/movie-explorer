import { TmdbExternalIds } from './tmdb-external-ids';
import { TmdbMovieProvider } from './tmdb-movie.provider';
import { TmdbSeriesProvider } from './tmdb-series.provider';
import { minimalSeriesDetails } from '../../../test/fixtures/series';

const config = {
  accessToken: 'test',
  apiBaseUrl: 'https://api.example/3',
  imageBaseUrl: 'https://images.example/w500',
  language: 'en-US',
};

describe('TMDB IMDb identification', () => {
  let fetchMock: jest.SpyInstance;
  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each(['movie', 'series'] as const)(
    'resolves %s external IDs and deduplicates requests',
    async (kind) => {
      fetchMock.mockResolvedValue(
        Response.json({ id: 603, imdb_id: 'tt0133093' }),
      );
      const ids = new TmdbExternalIds(config);
      await expect(
        Promise.all([ids.resolve(kind, 603), ids.resolve(kind, 603)]),
      ).resolves.toEqual(['tt0133093', 'tt0133093']);
      await ids.resolve(kind, 603);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(String(fetchMock.mock.calls[0][0])).toContain(
        `/${kind === 'movie' ? 'movie' : 'tv'}/603/external_ids`,
      );
    },
  );

  it.each([null, '603', '', 'ttabc'])(
    'caches missing or malformed IMDb IDs %p',
    async (value) => {
      const ids = new TmdbExternalIds(config);
      ids.remember('movie', 603, value);
      await expect(ids.resolve('movie', 603)).resolves.toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('reuses the movie details IMDb ID without fetching external IDs', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        id: 603,
        title: 'The Matrix',
        overview: '',
        genres: [],
        vote_average: 8,
        imdb_id: 'tt0133093',
      }),
    );
    const ids = new TmdbExternalIds(config);
    await new TmdbMovieProvider(config, ids).findOne(603);
    await expect(ids.resolve('movie', 603)).resolves.toBe('tt0133093');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('appends series external IDs and reuses the IMDb ID', async () => {
    const body = {
      name: minimalSeriesDetails.title,
      id: 1396,
      external_ids: { imdb_id: 'tt0903747' },
    };
    fetchMock.mockResolvedValue(Response.json(body));
    const ids = new TmdbExternalIds(config);
    await new TmdbSeriesProvider(config, ids).findOne(1396);
    await expect(ids.resolve('series', 1396)).resolves.toBe('tt0903747');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('external_ids');
  });

  it('expires retained IDs after one hour', async () => {
    jest.useFakeTimers();
    const ids = new TmdbExternalIds(config);
    ids.remember('movie', 603, 'tt0133093');
    await jest.advanceTimersByTimeAsync(3_600_001);
    fetchMock.mockResolvedValue(Response.json({ id: 603, imdb_id: null }));
    await expect(ids.resolve('movie', 603)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
