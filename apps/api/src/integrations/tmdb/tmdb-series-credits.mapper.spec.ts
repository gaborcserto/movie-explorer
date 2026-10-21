import { TmdbSeriesCreditsMapper } from './tmdb-series-credits.mapper';

describe('Series aggregate credits', () => {
  const mapper = new TmdbSeriesCreditsMapper('https://images.example/w500');
  const role = { credit_id: 'a', character: 'One', episode_count: 4 };

  it('keeps billing, multiple roles, supplied totals and unique identities', () => {
    const credits = mapper.map({
      cast: [
        { id: 2, name: 'Second', order: 2, roles: [] },
        {
          id: 1,
          name: 'First',
          order: 0,
          total_episode_count: 5,
          roles: [role],
        },
        {
          id: 1,
          name: 'First',
          order: 1,
          roles: [role, { character: 'Two', episode_count: 3 }],
        },
      ],
      crew: [
        {
          id: 1,
          name: 'First',
          department: 'Writing',
          total_episode_count: 10,
          jobs: [{ credit_id: 'w', job: 'Writer', episode_count: 2 }],
        },
        {
          id: 1,
          name: 'First',
          department: 'Production',
          total_episode_count: 20,
          jobs: [{ job: 'Executive Producer' }],
        },
      ],
    });

    expect(credits.cast.map((person) => person.id)).toEqual([1, 2]);
    expect(credits.cast[0].totalEpisodeCount).toBe(5);
    expect(credits.cast[0].characters).toHaveLength(2);
    expect(credits.crew).toHaveLength(1);
    expect(credits.crew[0].jobs).toEqual([
      { creditId: 'w', job: 'Writer', department: 'Writing', episodeCount: 2 },
      {
        creditId: null,
        job: 'Executive Producer',
        department: 'Production',
        episodeCount: null,
      },
    ]);
    expect(credits.sections.crew.status).toBe('available');
    expect(credits.crew[0].departments).toEqual([
      { department: 'Writing', totalEpisodeCount: 10 },
      { department: 'Production', totalEpisodeCount: 20 },
    ]);
    expect(credits.sections.cast.status).toBe('available');
    expect(credits.cast[0].profileUrl).toBeUndefined();
  });

  it('distinguishes empty, missing and partial categories without losing usable rows', () => {
    expect(mapper.map({ cast: [], crew: [] }).sections.cast.status).toBe(
      'available',
    );
    expect(mapper.map(undefined).sections.cast.status).toBe('unavailable');
    const partial = mapper.map({
      cast: [null, { id: 1, name: 'Person', roles: [{ character: '' }] }],
      crew: [],
    });
    expect(partial.cast[0].characters[0]).toEqual({
      character: null,
      creditId: null,
      episodeCount: null,
    });
    expect(partial.sections.cast.status).toBe('unavailable');
    expect(partial.sections.crew.status).toBe('available');
  });

  it('flags conflicting identity/count records and never sums participation', () => {
    const credits = mapper.map({
      cast: [
        { id: 1, name: 'Original', total_episode_count: 3, roles: [role] },
        { id: 1, name: 'Conflict', total_episode_count: 7, roles: [] },
      ],
      crew: 'invalid',
    });
    expect(credits.cast[0].name).toBe('Original');
    expect(credits.cast[0].totalEpisodeCount).toBe(3);
    expect(credits.sections.cast.status).toBe('unavailable');
    expect(credits.sections.crew.status).toBe('unavailable');
  });
});
