import type { RecommendationTitle } from '@movie-explorer/contracts';

import { genreSimilarity, rankTitles, scoreTitle } from './title-ranking';
import type { TitleSignals } from './title-ranking';

const scenarios = [
  {
    source: 'The Dark Knight',
    mediaType: 'movie',
    genres: [80, 18, 28],
    rating: 8.8,
    year: 2008,
    relevant: 'Heat',
    relevantGenres: [80, 18, 28],
    relevantRating: 8.2,
  },
  {
    source: 'Interstellar',
    mediaType: 'movie',
    genres: [878, 18, 12],
    rating: 8.6,
    year: 2014,
    relevant: 'Arrival',
    relevantGenres: [878, 18],
    relevantRating: 7.9,
  },
  {
    source: 'The Conjuring',
    mediaType: 'movie',
    genres: [27, 53],
    rating: 7.5,
    year: 2013,
    relevant: 'The Others',
    relevantGenres: [27, 53, 9648],
    relevantRating: 7.6,
  },
  {
    source: 'Breaking Bad',
    mediaType: 'tv',
    genres: [80, 18],
    rating: 9.2,
    year: 2008,
    relevant: 'Better Call Saul',
    relevantGenres: [80, 18],
    relevantRating: 8.7,
  },
  {
    source: 'The Big Bang Theory',
    mediaType: 'tv',
    genres: [35],
    rating: 7.9,
    year: 2007,
    relevant: 'Friends',
    relevantGenres: [35],
    relevantRating: 8.4,
  },
] as const;

// Representative, fixed evaluation data, not live ratings or a universal quality claim.
describe('recommendation quality evaluation', () => {
  it.each(scenarios)(
    '$source promotes $relevant over weak or unrelated candidates',
    (scenario) => {
      const source: TitleSignals = {
        genreIds: scenario.genres,
        rating: scenario.rating,
        voteCount: 10000,
        year: scenario.year,
      };
      const titles: RecommendationTitle[] = [
        {
          id: 1,
          mediaType: scenario.mediaType,
          title: 'Weak broad-genre match',
          rating: 5.1,
        },
        {
          id: 2,
          mediaType: scenario.mediaType,
          title: 'Unrelated popular documentary',
          rating: 9.1,
        },
        {
          id: 3,
          mediaType: scenario.mediaType,
          title: scenario.relevant,
          rating: scenario.relevantRating,
        },
      ];
      const signals = new Map<number, TitleSignals>([
        [
          1,
          {
            genreIds: [scenario.genres[0], 14, 10751, 37],
            rating: 5.1,
            voteCount: 1000,
            year: scenario.year,
          },
        ],
        [
          2,
          {
            genreIds: [99],
            rating: 9.1,
            voteCount: 10000,
            popularity: 10000,
            year: 2026,
          },
        ],
        [
          3,
          {
            genreIds: scenario.relevantGenres,
            rating: scenario.relevantRating,
            voteCount: 5000,
            year: scenario.year - 5,
          },
        ],
      ]);
      const before = titles.map((title) => ({ ...title }));
      const after = rankTitles(source, titles, signals).map(
        ({ title }) => title,
      );

      expect(before.map(({ id }) => id)).toEqual([1, 2, 3]);
      expect(after.map(({ id }) => id)).toEqual([3, 1, 2]);
      expect(
        genreSimilarity(source, signals.get(after[0].id) ?? {}),
      ).toBeGreaterThan(
        genreSimilarity(source, signals.get(before[0].id) ?? {}),
      );
      expect(after[0].rating).toBeGreaterThan(before[0].rating ?? 0);
      expect(Math.abs(scenario.rating - (after[0].rating ?? 0))).toBeLessThan(
        Math.abs(scenario.rating - (before[0].rating ?? 0)),
      );
      expect(new Set(after.map(({ id }) => id)).size).toBe(after.length);
      expect(
        rankTitles(source, titles, signals).map(({ title }) => title),
      ).toEqual(after);
      expect(titles).toEqual(before);
    },
  );

  it('preserves a lower-rated strongly relevant film ahead of an unrelated acclaimed film', () => {
    const source = { genreIds: [27], rating: 8.8, voteCount: 10000 };

    expect(
      scoreTitle(source, { genreIds: [27], rating: 5.1, voteCount: 1000 }, 1),
    ).toBeGreaterThan(
      scoreTitle(source, { genreIds: [35], rating: 9.1, voteCount: 10000 }, 0),
    );
  });

  it('shrinks tiny-vote extremes, treats missing ratings neutrally, and favors comparable quality', () => {
    const source = { genreIds: [18], rating: 8.8, voteCount: 10000 };
    const base = { genreIds: [18], voteCount: 10000 };

    expect(scoreTitle(source, { ...base, rating: 8.2 }, 0)).toBeGreaterThan(
      scoreTitle(source, { ...base, rating: 5.1 }, 0),
    );
    expect(scoreTitle(source, { ...base, rating: 8.2 }, 0)).toBeGreaterThan(
      scoreTitle(source, { ...base, rating: 10, voteCount: 1 }, 0),
    );
    expect(scoreTitle(source, { ...base, rating: undefined }, 0)).toBe(
      scoreTitle(source, { ...base, rating: 0 }, 0),
    );
    expect(scoreTitle(source, { ...base, rating: NaN }, 0)).toBe(
      scoreTitle(source, { ...base, rating: undefined }, 0),
    );
    expect(scoreTitle(source, { ...base, rating: 11 }, 0)).toBe(
      scoreTitle(source, { ...base, rating: undefined }, 0),
    );
    expect(scoreTitle({}, {}, 0)).toBeGreaterThan(0);
  });

  it('retains upstream order with equal metadata, and bounds weighted multi-genre coverage', () => {
    const titles: RecommendationTitle[] = [2, 1, 3].map((id) => ({
      id,
      title: String(id),
      mediaType: 'movie',
    }));

    expect(
      rankTitles({}, titles, new Map()).map(({ title }) => title.id),
    ).toEqual([2, 1, 3]);
    expect(
      genreSimilarity({ genreIds: [18, 80] }, { genreIds: [18, 80, 53, 28] }),
    ).toBeCloseTo(0.85);
    expect(genreSimilarity({ genreIds: [18, 18] }, { genreIds: [18] })).toBe(1);
    expect(genreSimilarity({ genreIds: [18] }, { genreIds: [27] })).toBe(0);
    expect(genreSimilarity({}, {})).toBe(0.5);
  });
});
