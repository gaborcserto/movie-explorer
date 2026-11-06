import { rankingSignals } from './tmdb-ranking-signals';

describe('internal TMDB ranking signals', () => {
  it('maps ID genres and distinct Movie/TV dates without translated-name matching', () => {
    const source = {
      id: 1,
      genres: [{ id: 18, name: 'Dráma' }, { id: 18 }, { id: -1 }],
      vote_average: 8.2,
      vote_count: 100,
      release_date: '2001-01-01',
      first_air_date: '2020-01-01',
      popularity: 50,
    };

    expect(rankingSignals(source, 'movie')).toEqual({
      genreIds: [18],
      rating: 8.2,
      voteCount: 100,
      popularity: 50,
      year: 2001,
    });
    expect(rankingSignals(source, 'tv').year).toBe(2020);
    expect(
      rankingSignals({ ...source, genre_ids: [27, 27, -1, '18', NaN] }, 'movie')
        .genreIds,
    ).toEqual([27]);
  });

  it.each([null, {}, { id: -1 }, { id: 1, adult: true }])(
    'rejects ineligible metadata %j',
    (value) => {
      expect(rankingSignals(value, 'movie')).toEqual({});
    },
  );

  it.each([0, -1, NaN, Infinity, 11, '8'])(
    'does not fabricate a rating from %j',
    (vote_average) => {
      expect(
        rankingSignals({ id: 1, vote_average }, 'movie').rating,
      ).toBeUndefined();
    },
  );

  it('handles zero, invalid and absent vote counts and invalid dates', () => {
    expect(
      rankingSignals({ id: 1, vote_average: 8, vote_count: 0 }, 'movie').rating,
    ).toBeUndefined();
    expect(
      rankingSignals(
        {
          id: 1,
          vote_average: 8,
          vote_count: -1,
          popularity: Infinity,
          release_date: 'invalid',
        },
        'movie',
      ),
    ).toMatchObject({
      voteCount: undefined,
      popularity: undefined,
      year: undefined,
    });
    expect(rankingSignals({ id: 1, vote_average: 8 }, 'tv')).toMatchObject({
      rating: 8,
      voteCount: undefined,
    });
  });
});
