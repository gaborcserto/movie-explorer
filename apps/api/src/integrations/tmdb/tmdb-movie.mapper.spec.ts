import { TmdbMovieMapper } from './tmdb-movie.mapper';

const mapper = new TmdbMovieMapper('https://image.tmdb.org/t/p/w500');

describe('TmdbMovieMapper', () => {
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

  it('maps directors and limits cast to the first six billed names', () => {
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

    expect(movie.photos).toEqual([
      {
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
