import type { RecommendationTitle } from '@movie-explorer/contracts';

import { sampleTitles } from './sample-titles';

function titles(count: number): RecommendationTitle[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    mediaType: 'movie',
    title: `Movie ${index + 1}`,
  }));
}

describe('sampleTitles', () => {
  it.each([0, 1, 9, 10, 100])(
    'samples up to ten distinct titles from %i without mutating the pool',
    (size) => {
      const pool = Object.freeze(titles(size));
      const before = [...pool];
      const selected = sampleTitles(pool, () => 0.75);

      expect(selected).toHaveLength(Math.min(10, size));
      expect(new Set(selected.map((title) => title.id)).size).toBe(
        selected.length,
      );
      expect(pool).toEqual(before);
      expect(selected.every((title) => pool.includes(title))).toBe(true);
      expect(selected).not.toBe(pool);
    },
  );

  it('has a deterministic sequence and can select the final candidate', () => {
    const pool = titles(100);

    expect(sampleTitles(pool, () => 0).map((title) => title.id)).toEqual(
      Array.from({ length: 10 }, (_, index) => index + 1),
    );
    expect(sampleTitles(pool, () => 0.999).map((title) => title.id)).toEqual([
      100, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });

  it('gives each candidate equal opportunity at each step', () => {
    const pool = titles(3);
    const outcomes = new Set<string>();

    // Enumerate every Fisher–Yates branch for a three-item pool: 3! outcomes.
    for (let first = 0; first < 3; first += 1) {
      for (let second = 0; second < 2; second += 1) {
        const draws = [first / 3, second / 2, 0];
        let index = 0;
        const selected = sampleTitles(pool, () => draws[index++]);
        outcomes.add(selected.map((title) => title.id).join(','));
      }
    }

    expect(outcomes.size).toBe(6);
  });
});
