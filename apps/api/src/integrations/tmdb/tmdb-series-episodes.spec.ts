import { Logger } from '@nestjs/common';

import { TmdbSeriesProvider } from './tmdb-series.provider';
import { TmdbSeriesMapper } from './tmdb-series.mapper';
import {
  validateTmdbSeason,
  validateTmdbEpisode,
} from './tmdb-series.validation';

const episode = {
  id: 30,
  name: 'Arrival',
  season_number: 0,
  episode_number: 3,
  show_id: 1,
};
const season = {
  id: 10,
  name: 'Specials',
  season_number: 0,
  episodes: [episode],
};
const mapper = new TmdbSeriesMapper('https://images.example/w500');

describe('series season and episode mapping', () => {
  it('preserves season 0, gaps, ordering and identity deduplication', () => {
    const body = {
      ...season,
      episodes: [{ ...episode, id: 80, episode_number: 8 }, episode, episode],
    };
    validateTmdbSeason(body, 1, 0);
    const result = mapper.toSeasonDetails(body, 1);
    expect(result).toMatchObject({
      seriesId: 1,
      seasonNumber: 0,
      episodeCount: 2,
      posterUrl: null,
      airDate: null,
    });
    expect(result.episodes.map((row) => row.episodeNumber)).toEqual([3, 8]);
    expect(result.episodes[0]).toMatchObject({
      runtimeMinutes: null,
      stillUrl: null,
      rating: null,
      voteCount: null,
    });
  });

  it.each([
    { ...season, episodes: undefined },
    { ...season, episodes: [null] },
    { ...season, season_number: 1 },
    { ...season, episodes: [episode, { ...episode, id: 40 }] },
    { ...season, episodes: [episode, { ...episode, episode_number: 4 }] },
    { ...season, episodes: [{ ...episode, show_id: 2 }] },
  ])('rejects malformed or conflicting season data %#', (body) => {
    expect(() => validateTmdbSeason(body, 1, 0)).toThrow();
  });

  it('allows an empty future season and episode details without show_id', () => {
    expect(() =>
      validateTmdbSeason({ ...season, episodes: [] }, 1, 0),
    ).not.toThrow();
    expect(
      mapper.toSeasonDetails({ ...season, episodes: [] }, 1).episodeCount,
    ).toBe(0);
    expect(() =>
      validateTmdbEpisode(
        { id: 30, name: 'Arrival', season_number: 0, episode_number: 3 },
        1,
        0,
        3,
      ),
    ).not.toThrow();
    expect(() => validateTmdbEpisode(episode, 1, 0, 4)).toThrow();
  });

  it('maps still/date/runtime/rating and preserves zero votes', () => {
    expect(
      mapper.toEpisodeSummary(
        {
          ...episode,
          still_path: '/still.jpg',
          air_date: '2026-01-01',
          runtime: 42,
          vote_average: 0,
          vote_count: 0,
        },
        1,
      ),
    ).toMatchObject({
      stillUrl: 'https://images.example/w500/still.jpg',
      airDate: '2026-01-01',
      runtimeMinutes: 42,
      rating: 0,
      voteCount: 0,
    });
  });

  it('normalizes series enrichment without another provider lookup', () => {
    expect(
      mapper.toSeriesDetails({
        id: 1,
        name: 'Series',
        vote_count: 0,
        origin_country: [' us ', 'US', 'gb', null, 'invalid'],
      }),
    ).toMatchObject({ voteCount: 0, originCountries: ['US', 'GB'] });
    expect(
      mapper.toSeriesDetails({ id: 1, name: 'Series', vote_count: 1.5 }),
    ).toMatchObject({ voteCount: null, originCountries: [] });
  });

  it('keeps independent credit availability, base data and multiple roles/jobs', () => {
    const base = {
      ...episode,
      guest_stars: [
        { id: 2, name: 'Guest', character: 'A' },
        { id: 2, name: 'Guest', character: 'B' },
      ],
      crew: [
        { id: 4, name: 'Writer', department: 'Writing', job: 'Writer' },
        { id: 4, name: 'Writer', department: 'Writing', job: 'Story' },
      ],
    };
    const result = mapper.toEpisodeCredits(
      { id: 30, cast: null, guest_stars: [null] },
      base,
    );
    expect(result.sections).toEqual({
      cast: { status: 'unavailable' },
      guestStars: { status: 'available' },
      crew: { status: 'available' },
    });
    expect(result.guestStars).toEqual([
      { id: 2, name: 'Guest', characters: ['A', 'B'] },
    ]);
    expect(result.crew).toEqual([
      {
        id: 4,
        name: 'Writer',
        department: 'Writing',
        jobs: ['Writer', 'Story'],
      },
    ]);
    expect(
      mapper.toEpisodeCredits({ id: 30, cast: [], guest_stars: [], crew: [] })
        .sections.cast.status,
    ).toBe('available');
  });
});

describe('series season/episode transport', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();
  const provider = new TmdbSeriesProvider({
    accessToken: 'test-only',
    apiBaseUrl: 'https://api.example/3',
    imageBaseUrl: 'https://images.example/w500',
    language: 'hu-HU',
    requestTimeoutMs: 50,
  });

  beforeEach(() => {
    global.fetch = fetchMock;
    fetchMock.mockReset();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('uses one localized season call with no per-row fetches', async () => {
    fetchMock.mockResolvedValue(Response.json(season));
    await expect(provider.findSeason(1, 0)).resolves.toMatchObject({
      seriesId: 1,
      episodeCount: 1,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'https://api.example/3/tv/1/season/0?language=hu-HU',
    );
  });

  it('embeds credits in one bounded request and matches standalone recovery', async () => {
    const credits = {
      id: 30,
      cast: [{ id: 2, name: 'Actor', character: 'A' }],
      guest_stars: [],
      crew: [],
    };
    fetchMock
      .mockResolvedValueOnce(Response.json({ ...episode, credits }))
      .mockResolvedValueOnce(Response.json(credits));
    const result = await provider.findEpisode(1, 0, 3);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      'append_to_response=credits',
    );
    expect(await provider.findEpisodeCredits(1, 0, 3)).toEqual(result.credits);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it('accepts ID-less appended episode credits and matches standalone recovery without an initial waterfall', async () => {
    const credits = {
      cast: [{ id: 2, name: 'Actor', character: 'A' }],
      guest_stars: [],
      crew: [],
    };
    fetchMock
      .mockResolvedValueOnce(Response.json({ ...episode, credits }))
      .mockResolvedValueOnce(Response.json({ id: episode.id, ...credits }));

    const result = await provider.findEpisode(1, 0, 3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.credits.cast).toEqual([
      { id: 2, name: 'Actor', characters: ['A'] },
    ]);
    expect(result.credits.sections).toEqual({
      cast: { status: 'available' },
      guestStars: { status: 'available' },
      crew: { status: 'available' },
    });
    await expect(provider.findEpisodeCredits(1, 0, 3)).resolves.toEqual(
      result.credits,
    );
  });

  it.each([31, null, '30'])(
    'rejects explicitly conflicting appended episode credit identity %j',
    async (id) => {
      fetchMock.mockResolvedValue(
        Response.json({
          ...episode,
          credits: {
            id,
            cast: [{ id: 2, name: 'Wrong actor' }],
            guest_stars: [],
            crew: [],
          },
        }),
      );
      const result = await provider.findEpisode(1, 0, 3);
      expect(result.credits.cast).toEqual([]);
      expect(result.credits.sections.cast.status).toBe('unavailable');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['season', 'episode', 'credits'])(
    'preserves resource 404 for %s',
    async (kind) => {
      fetchMock.mockResolvedValue(new Response('', { status: 404 }));
      const result =
        kind === 'season'
          ? provider.findSeason(1, 0)
          : kind === 'episode'
            ? provider.findEpisode(1, 0, 3)
            : provider.findEpisodeCredits(1, 0, 3);
      await expect(result).resolves.toBeUndefined();
    },
  );

  it.each([401, 429, 500])(
    'classifies %s without fallback requests',
    async (status) => {
      fetchMock.mockResolvedValue(
        new Response('', { status, headers: { 'Retry-After': '12' } }),
      );
      await expect(provider.findEpisode(1, 0, 3)).rejects.toMatchObject({
        status: status === 429 ? 429 : 502,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it('rejects invalid core and malformed JSON without fallback', async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ ...episode, episode_number: 4 }))
      .mockResolvedValueOnce(new Response('{'));
    await expect(provider.findEpisode(1, 0, 3)).rejects.toMatchObject({
      status: 502,
    });
    await expect(provider.findEpisode(1, 0, 3)).rejects.toMatchObject({
      status: 502,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('times out while reading JSON and clears the operation timer', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation((_url: URL, init: RequestInit) =>
      Promise.resolve({
        status: 200,
        ok: true,
        json: () =>
          new Promise((_resolve, reject) =>
            init.signal.addEventListener('abort', () =>
              reject(new Error('aborted')),
            ),
          ),
      }),
    );
    const assertion = expect(
      provider.findEpisode(1, 0, 3),
    ).rejects.toMatchObject({ status: 504 });
    await jest.advanceTimersByTimeAsync(51);
    await assertion;
    expect(jest.getTimerCount()).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
