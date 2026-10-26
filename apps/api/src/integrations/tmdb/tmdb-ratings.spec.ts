import { normalizeTmdbRating } from './tmdb-ratings';

describe('normalizeTmdbRating', () => {
  it('normalizes a valid score and vote count', () => {
    expect(normalizeTmdbRating(8.4, 1200)).toEqual({
      status: 'available',
      score: 8.4,
      voteCount: 1200,
    });
  });

  it.each([0, 10])('accepts score %s', (score) => {
    expect(normalizeTmdbRating(score, 0)).toEqual({
      status: 'available',
      score,
      voteCount: 0,
    });
  });

  it('uses a null vote count when the count is omitted', () => {
    expect(normalizeTmdbRating(7.5, undefined)).toEqual({
      status: 'available',
      score: 7.5,
      voteCount: null,
    });
  });

  it.each([
    [-1, 1],
    [10.1, 1],
    [Number.NaN, 1],
    [Number.POSITIVE_INFINITY, 1],
    ['8', 1],
    [8, -1],
    [8, 1.5],
    [8, Number.NaN],
    [8, Number.POSITIVE_INFINITY],
    [8, Number.MAX_SAFE_INTEGER + 1],
    [8, null],
    [8, '1200'],
  ])('rejects invalid score %s and vote count %s', (score, voteCount) => {
    expect(normalizeTmdbRating(score, voteCount)).toEqual({
      status: 'unavailable',
      reason: 'invalid-response',
    });
  });
});
