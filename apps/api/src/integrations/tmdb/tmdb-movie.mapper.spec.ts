import { TmdbMovieMapper } from './tmdb-movie.mapper';

const mapper = new TmdbMovieMapper('https://image.tmdb.org/t/p/w500');

describe('TmdbMovieMapper', () => {
  const metadataMovie = {
    id: 1,
    title: 'Movie',
    genres: [],
    overview: '',
    poster_path: null,
    runtime: null,
    vote_average: 0,
  };

  it('maps original metadata and USD amounts without deriving values', () => {
    expect(
      mapper.toMovieDetails({
        ...metadataMovie,
        original_title: '千と千尋の神隠し — Original',
        status: 'Released',
        original_language: 'ja',
        budget: 225000000,
        revenue: 2512865567,
      }),
    ).toMatchObject({
      originalTitle: '千と千尋の神隠し — Original',
      status: 'Released',
      originalLanguage: 'ja',
      budget: 225000000,
      revenue: 2512865567,
    });
  });

  it.each([undefined, null, '', '100', -1, NaN, Infinity, {}])(
    'omits malformed or absent optional metadata %p without failing primary details',
    (value) => {
      const result = mapper.toMovieDetails({
        ...metadataMovie,
        original_title: value,
        status: value,
        original_language: value,
        budget: value,
        revenue: value,
      });
      expect(result.title).toBe('Movie');
      expect(result.budget).toBeUndefined();
      expect(result.revenue).toBeUndefined();
      if (typeof value !== 'string' || !value.trim()) {
        expect(result.originalTitle).toBeUndefined();
        expect(result.status).toBeUndefined();
        expect(result.originalLanguage).toBeUndefined();
      }
    },
  );

  it('retains zero amounts as provider-supported unknown values', () => {
    expect(
      mapper.toMovieDetails({
        ...metadataMovie,
        budget: 0,
        revenue: 0,
        status: 'Unfamiliar status',
      }),
    ).toMatchObject({ budget: 0, revenue: 0, status: 'Unfamiliar status' });
  });

  it('maps reviewed writing and producing jobs explicitly, preserving distinctions and excluding unrelated department jobs', () => {
    const result = mapper.toMovieDetails({
      ...metadataMovie,
      credits: {
        cast: [],
        crew: [
          { id: 1, name: 'Source Author', department: 'Writing', job: 'Novel' },
          { id: 2, name: 'Creator', department: 'Writing', job: 'Characters' },
          { id: 2, name: 'Creator', department: 'Writing', job: 'Comic Book' },
          { id: 2, name: 'Creator', department: 'Writing', job: 'Comic Book' },
          { id: 3, name: 'Ambiguous', department: 'Writing', job: 'Other' },
          { id: 4, name: 'Casting', department: 'Production', job: 'Casting' },
          {
            id: 5,
            name: 'Manager',
            department: 'Production',
            job: 'Unit Production Manager',
          },
          {
            id: 6,
            name: 'Co Producer',
            department: 'Production',
            job: 'Co-Producer',
          },
          {
            id: 6,
            name: 'Co Producer',
            department: 'Production',
            job: 'Executive Producer',
          },
          {
            id: 7,
            name: 'Associate',
            department: 'Production',
            job: 'Associate Producer',
          },
          {
            id: 8,
            name: 'Assistant',
            department: 'Directing',
            job: 'First Assistant Director',
          },
        ],
      },
    });
    expect(result.writers).toEqual([
      { id: 1, name: 'Source Author', roles: ['Novel'] },
      { id: 2, name: 'Creator', roles: ['Characters', 'Comic Book'] },
    ]);
    expect(result.producers).toEqual([
      {
        id: 6,
        name: 'Co Producer',
        roles: ['Co-Producer', 'Executive Producer'],
      },
      { id: 7, name: 'Associate', roles: ['Associate Producer'] },
    ]);
    expect(result.directors).toBeUndefined();
  });

  it('retains distinct characters for repeated person IDs across the complete cast', () => {
    const result = mapper.toMovieDetails({
      id: 1,
      title: 'Multiple roles',
      poster_path: null,
      genres: [],
      vote_average: 0,
      runtime: null,
      overview: '',
      credits: {
        cast: [
          { id: 10, name: 'Actor', order: 0, character: ' Hero ' },
          ...Array.from({ length: 6 }, (_, index) => ({
            id: 20 + index,
            name: `Actor ${index}`,
            order: index + 1,
          })),
          { id: 10, name: 'Actor', order: 7, character: 'Narrator' },
          { id: 10, name: 'Actor', order: 8, character: 'Hero' },
          { name: 'No ID', order: 9, character: 'Other' },
        ],
        crew: [],
      },
    });
    expect(result.castMembers).toHaveLength(8);
    expect(result.castMembers[0]).toMatchObject({
      id: 10,
      name: 'Actor',
      character: 'Hero / Narrator',
    });
    expect(result.castMembers.map((member) => member.id)).toEqual([
      10,
      20,
      21,
      22,
      23,
      24,
      25,
      undefined,
    ]);
  });

  it('preserves person identities and unknown cast roles, deduplicating across the complete cast', () => {
    const result = mapper.toMovieDetails({
      id: 1,
      title: 'Credits',
      poster_path: null,
      genres: [],
      vote_average: 0,
      runtime: null,
      overview: '',
      credits: {
        cast: [
          { id: 10, name: 'Same Name', order: 0 },
          { id: 10, name: 'Same Name', order: 1 },
          { id: 11, name: 'Same Name', order: 2 },
          { id: 0, name: 'No ID', order: 3 },
          { id: -1, name: 'Another', order: 4 },
          { name: 'Fifth', order: 5 },
          {
            id: 12,
            name: 'Sixth',
            order: 6,
            character: ' Role ',
            profile_path: '/actor.jpg',
          },
          { id: 13, name: 'Seventh', order: 7 },
        ],
        crew: [
          {
            id: 20,
            name: 'Director',
            job: 'Director',
            profile_path: '/director.jpg',
          },
          { id: 20, name: 'Director', job: 'Director' },
          { id: 21, name: 'Director', job: 'Director' },
          { name: 'Unknown ID', job: 'Director' },
          { id: 22, name: 'Writer', job: 'Writer' },
        ],
      },
    });
    expect(result.cast).toEqual([
      'Same Name',
      'Same Name',
      'No ID',
      'Another',
      'Fifth',
      'Sixth',
      'Seventh',
    ]);
    expect(result.castMembers).toHaveLength(7);
    expect(result.castMembers[0]).toEqual({ id: 10, name: 'Same Name' });
    expect(result.castMembers[1]).toEqual({ id: 11, name: 'Same Name' });
    expect(result.castMembers[2]).toEqual({ name: 'No ID' });
    expect(result.castMembers[5]).toMatchObject({
      id: 12,
      character: 'Role',
      profileUrl: 'https://image.tmdb.org/t/p/w500/actor.jpg',
    });
    expect(result.director).toBe('Director, Unknown ID');
    expect(result.directors).toEqual([
      {
        id: 20,
        name: 'Director',
        profileUrl: 'https://image.tmdb.org/t/p/w500/director.jpg',
        profileSrcSet:
          'https://image.tmdb.org/t/p/w185/director.jpg 1x, https://image.tmdb.org/t/p/h632/director.jpg 2x, https://image.tmdb.org/t/p/original/director.jpg 3x',
      },
      { id: 21, name: 'Director' },
      { name: 'Unknown ID' },
    ]);
  });

  it('maps explicit writing and producing jobs, combining jobs only for valid shared identities', () => {
    const result = mapper.toMovieDetails({
      id: 1,
      title: 'Crew',
      poster_path: null,
      genres: [],
      vote_average: 0,
      runtime: null,
      overview: '',
      credits: {
        cast: [],
        crew: [
          { id: 1, name: 'Shared', job: 'Director' },
          { id: 1, name: 'Shared', job: 'Screenplay' },
          { id: 1, name: 'Shared', job: 'Story', profile_path: '/writer.jpg' },
          { id: 1, name: 'Shared', job: 'Story' },
          { id: 2, name: 'Shared', job: 'Writer' },
          { name: 'Unknown', job: 'Writer' },
          { id: 0, name: 'Unknown', job: 'Story' },
          { id: 1, name: 'Shared', job: 'Producer' },
          { id: 3, name: 'Producer Two', job: 'Producer' },
          { id: 3, name: 'Producer Two', job: 'Producer' },
          { name: 'Unknown Producer', job: 'Producer' },
          { id: -1, name: 'Invalid Producer', job: 'Producer' },
          { id: 4, name: 'Executive', job: 'Executive Producer' },
          { id: 5, name: 'Manager', job: 'Production Manager' },
          { id: 6, name: 'Assistant', job: 'Assistant Director' },
          { id: 7, name: '  ', job: 'Writer' },
          { id: 8, name: '  ', job: 'Producer' },
        ],
      },
    });
    expect(result.writers).toEqual([
      expect.objectContaining({
        id: 1,
        name: 'Shared',
        roles: ['Screenplay', 'Story'],
        profileUrl: 'https://image.tmdb.org/t/p/w500/writer.jpg',
        profileSrcSet: expect.stringContaining('/w185/writer.jpg 1x'),
      }),
      { id: 2, name: 'Shared', roles: ['Writer'] },
      { name: 'Unknown', roles: ['Writer'] },
      { name: 'Unknown', roles: ['Story'] },
    ]);
    expect(result.producers).toEqual([
      { id: 1, name: 'Shared', roles: ['Producer'] },
      { id: 3, name: 'Producer Two', roles: ['Producer'] },
      { name: 'Unknown Producer', roles: ['Producer'] },
      { name: 'Invalid Producer', roles: ['Producer'] },
      { id: 4, name: 'Executive', roles: ['Executive Producer'] },
    ]);
    expect(result.directors).toEqual([{ id: 1, name: 'Shared' }]);
  });

  it('maps list items to the public movie summary contract', () => {
    expect(
      mapper.toMovieSummary(
        {
          id: 1,
          title: 'Alpha',
          release_date: '2020-01-01',
          poster_path: '/alpha.jpg',
          popularity: 100,
          genre_ids: [18, 999, 35],
          vote_average: 8,
          overview: 'Alpha overview',
        },
        [
          { id: 18, name: 'Drama' },
          { id: 35, name: 'Comedy' },
        ],
      ),
    ).toEqual({
      id: 1,
      title: 'Alpha',
      releaseDate: '2020-01-01',
      posterUrl: 'https://image.tmdb.org/t/p/w500/alpha.jpg',
      posterSrcSet:
        'https://image.tmdb.org/t/p/w342/alpha.jpg 1x, https://image.tmdb.org/t/p/w780/alpha.jpg 2x, https://image.tmdb.org/t/p/original/alpha.jpg 3x',
      genres: ['Drama', 'Comedy'],
    });
  });

  it('preserves movie data when TMDB omits optional genre ids', () => {
    expect(
      mapper.toMovieSummary(
        {
          id: 1798695,
          title: 'Kaalidas Collection',
          release_date: '2025-01-01',
          poster_path: '/kaalidas.jpg',
          popularity: 0,
          vote_average: 0,
          overview: '',
        },
        [],
      ),
    ).toEqual({
      id: 1798695,
      title: 'Kaalidas Collection',
      releaseDate: '2025-01-01',
      posterUrl: 'https://image.tmdb.org/t/p/w500/kaalidas.jpg',
      posterSrcSet:
        'https://image.tmdb.org/t/p/w342/kaalidas.jpg 1x, https://image.tmdb.org/t/p/w780/kaalidas.jpg 2x, https://image.tmdb.org/t/p/original/kaalidas.jpg 3x',
      genres: [],
    });
  });

  it('maps directors and the complete cast in billing order', () => {
    expect(
      mapper.toMovieDetails({
        id: 2,
        title: 'Beta',
        release_date: '2024-01-01',
        poster_path: '/beta.jpg',
        genres: [{ id: 18, name: 'Drama' }],
        vote_average: 7.5,
        runtime: 100,
        overview: 'Beta overview',
        credits: {
          cast: [
            { name: 'Actor Seven', order: 6 },
            { name: 'Actor Two', order: 1 },
            { name: 'Actor One', order: 0 },
            { name: 'Actor Four', order: 3 },
            { name: 'Actor Three', order: 2 },
            { name: 'Actor Six', order: 5 },
            { name: 'Actor Five', order: 4 },
          ],
          crew: [
            { name: 'Writer One', job: 'Writer' },
            { name: 'Director One', job: 'Director' },
            { name: 'Director Two', job: 'Director' },
          ],
        },
      }),
    ).toMatchObject({
      posterPreviewUrl: 'https://image.tmdb.org/t/p/w92/beta.jpg',
      cast: [
        'Actor One',
        'Actor Two',
        'Actor Three',
        'Actor Four',
        'Actor Five',
        'Actor Six',
        'Actor Seven',
      ],
      director: 'Director One, Director Two',
    });
  });

  it('maps separate optimized and original photo URLs from the same image path', () => {
    const movie = mapper.toMovieDetails({
      id: 4,
      title: 'Photos',
      release_date: '2024-01-01',
      poster_path: null,
      genres: [],
      vote_average: 7,
      runtime: 90,
      overview: '',
      images: {
        backdrops: [{ file_path: '/backdrop.jpg', width: 1920, height: 1080 }],
      },
    });

    expect(movie.backdrops).toEqual([
      {
        filePath: '/backdrop.jpg',
        width: 1920,
        height: 1080,
        thumbnailUrl: 'https://image.tmdb.org/t/p/w500/backdrop.jpg',
        fullUrl: 'https://image.tmdb.org/t/p/original/backdrop.jpg',
      },
    ]);
  });

  it('omits missing optional detail values and keeps an empty cast', () => {
    expect(
      mapper.toMovieDetails({
        id: 2,
        title: 'Beta',
        poster_path: null,
        genres: [],
        vote_average: 0,
        runtime: null,
        overview: '',
      }),
    ).toEqual({
      cast: [],
      id: 2,
      title: 'Beta',
      posterUrl: '',
      genres: [],
    });
  });

  it('uses supported portrait densities and omits candidates for missing images', () => {
    const movie = mapper.toMovieDetails({
      id: 5,
      title: 'Cast',
      release_date: '',
      poster_path: null,
      genres: [],
      vote_average: 0,
      runtime: null,
      overview: '',
      credits: {
        cast: [
          { name: 'Actor', order: 0, profile_path: '/actor.jpg' },
          { name: 'Missing', order: 1 },
        ],
        crew: [],
      },
    });
    expect(movie.posterSrcSet).toBeUndefined();
    expect(movie.posterPreviewUrl).toBeUndefined();
    expect(movie.castMembers?.[0].profileSrcSet).toBe(
      'https://image.tmdb.org/t/p/w185/actor.jpg 1x, https://image.tmdb.org/t/p/h632/actor.jpg 2x, https://image.tmdb.org/t/p/original/actor.jpg 3x',
    );
    expect(movie.castMembers?.[1].profileSrcSet).toBeUndefined();
  });

  it('omits a zero runtime rather than presenting it as real metadata', () => {
    const movie = mapper.toMovieDetails({
      id: 3,
      title: 'Gamma',
      release_date: '2020-01-01',
      poster_path: null,
      genres: [],
      vote_average: 5,
      runtime: 0,
      overview: 'Gamma overview',
    });

    expect(movie.runtimeMinutes).toBeUndefined();
  });
});
