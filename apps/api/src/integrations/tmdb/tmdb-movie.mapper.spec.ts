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

  it('maps missing optional TMDB values to stable public defaults', () => {
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
      id: 2,
      title: 'Beta',
      releaseDate: '',
      posterUrl: '',
      genres: [],
      rating: 0,
      runtimeMinutes: 0,
      description: '',
    });
  });
});
