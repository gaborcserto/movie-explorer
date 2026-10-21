import { Logger } from '@nestjs/common';

import { TmdbPersonFilmographyProvider } from './tmdb-person-filmography.provider';
import { TmdbPersonFilmographyMapper } from './tmdb-person-filmography.mapper';

const config = {
  accessToken: 'test',
  apiBaseUrl: 'https://api.example/3',
  imageBaseUrl: 'https://images.example/w500',
  language: 'hu-HU',
  requestTimeoutMs: 50,
};
const movie = {
  id: 1,
  cast: [
    { id: 7, title: 'Movie', release_date: '2020-01-01', character: 'Actor' },
  ],
  crew: [],
};
const tv = {
  id: 1,
  cast: [
    {
      id: 7,
      name: 'Series',
      first_air_date: '2021-01-01',
      character: 'One',
      credit_id: 'a',
      episode_count: 4,
    },
    {
      id: 7,
      name: 'Series',
      character: 'Two',
      credit_id: 'b',
      episode_count: 3,
    },
  ],
  crew: [
    {
      id: 7,
      name: 'Series',
      job: 'Writer',
      department: 'Writing',
      episode_count: 2,
    },
    { id: 7, name: 'Series', job: 'Producer', department: 'Production' },
  ],
};

describe('Combined Person filmography', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();
  let provider: TmdbPersonFilmographyProvider;

  beforeEach(() => {
    global.fetch = fetchMock;
    fetchMock.mockReset();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    provider = new TmdbPersonFilmographyProvider(config);
  });
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('maps both sources in one opt-in request while retaining legacy movie rows', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({
        id: 1,
        name: 'Person',
        movie_credits: movie,
        tv_credits: tv,
      }),
    );
    const person = await provider.findPerson(1);
    expect(person.filmography).toHaveLength(1);
    expect(person.filmography[0]).not.toHaveProperty('mediaType');
    expect(
      person.combinedFilmography.entries.map(
        (entry) => `${entry.mediaType}:${entry.id}`,
      ),
    ).toEqual(['movie:7', 'tv:7']);
    expect(person.combinedFilmography.entries[1]).toMatchObject({
      firstAirDate: '2021-01-01',
      actingCredits: ['One', 'Two'],
      actingRoles: [
        { character: 'One', episodeCount: 4 },
        { character: 'Two', episodeCount: 3 },
      ],
      crewCredits: [
        { job: 'Writer', episodeCount: 2 },
        { job: 'Producer', episodeCount: null },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      fetchMock.mock.calls[0][0].searchParams.get('append_to_response'),
    ).toBe('movie_credits,tv_credits,images');
    expect(fetchMock.mock.calls[0][0].searchParams.get('language')).toBe(
      'hu-HU',
    );
  });

  it('preserves profile and successful source when an appended source is missing', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ id: 1, name: 'Person', movie_credits: movie }),
    );
    const person = await provider.findPerson(1);
    expect(person.name).toBe('Person');
    expect(person.combinedFilmography.groups).toEqual({
      movie: { status: 'available' },
      tv: { status: 'unavailable' },
    });
    expect(person.combinedFilmography.entries).toHaveLength(1);
  });

  it.each(['movie', 'tv'] as const)(
    'scoped %s recovery fetches only its source and exposes only its group',
    async (type) => {
      fetchMock.mockResolvedValueOnce(
        Response.json(type === 'movie' ? movie : tv),
      );
      const result = await provider.findCombined(1, type);
      expect(result.groups).toEqual({ [type]: { status: 'available' } });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0].pathname).toBe(
        `/3/person/1/${type}_credits`,
      );
    },
  );

  it('retains successful empty sources with rate-limited partial recovery', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ id: 1, cast: [], crew: [] }),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(null, { status: 429, headers: { 'Retry-After': '12' } }),
    );
    await expect(provider.findCombined(1, 'all')).resolves.toEqual({
      entries: [],
      groups: {
        movie: { status: 'available' },
        tv: { status: 'unavailable', retryAfterSeconds: 12 },
      },
    });
  });

  it('prioritizes rate limiting when all sources fail and preserves missing-person 404', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 429 }));
    await expect(provider.findCombined(1, 'all')).rejects.toMatchObject({
      status: 429,
    });
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    await expect(provider.findCombined(1, 'all')).resolves.toBeUndefined();
    await expect(provider.findPerson(1)).resolves.toBeUndefined();
  });

  it('rejects malformed or mismatched standalone sources', async () => {
    for (const body of [
      { id: 2, cast: [], crew: [] },
      { id: 1, cast: null, crew: [] },
      { success: false },
    ]) {
      fetchMock.mockResolvedValueOnce(Response.json(body));
      await expect(provider.findCombined(1, 'tv')).rejects.toMatchObject({
        status: 502,
      });
    }
  });

  it('uses one bounded deadline and cleans up a timed out opt-in request', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementationOnce(
      (_url, init: RequestInit) =>
        new Promise((_resolve, reject) =>
          init.signal.addEventListener('abort', () =>
            reject(new Error('aborted')),
          ),
        ),
    );
    const result = expect(provider.findPerson(1)).rejects.toMatchObject({
      status: 504,
    });
    await jest.advanceTimersByTimeAsync(51);
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('normalizes minimal, undated, multiple and malformed TV records without invented counts', () => {
    const mapper = new TmdbPersonFilmographyMapper(config.imageBaseUrl);
    const rows = mapper.series({
      cast: [
        null,
        { id: 1, name: 'Minimal', character: '' },
        { id: 2, name: 'Adult', adult: true },
      ],
      crew: [],
    });
    expect(rows).toEqual([
      {
        mediaType: 'tv',
        id: 1,
        title: 'Minimal',
        originalTitle: null,
        firstAirDate: null,
        posterUrl: null,
        genres: [],
        crewCredits: [],
        actingCredits: [],
        actingRoles: [{ character: null, creditId: null, episodeCount: null }],
      },
    ]);
    expect(() => mapper.series({ cast: [] })).toThrow();
  });
});
