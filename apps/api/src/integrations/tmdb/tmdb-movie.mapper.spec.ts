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
      genres: ['Drama', 'Comedy'],
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

  it('omits missing optional detail values and keeps an empty cast', () => {
    expect(
      mapper.toMovieDetails({
        id: 2,
        title: 'Beta',
        release_date: '',
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
      releaseDate: '',
      posterUrl: '',
      genres: [],
    });
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
