import type { RecommendationTitle } from '@movie-explorer/contracts';

/** Partial Fisher–Yates: sample without replacement without mutating the pool. */
export function sampleTitles(
  pool: readonly RecommendationTitle[],
  random: () => number = Math.random,
): RecommendationTitle[] {
  const titles = [...pool];
  const count = Math.min(10, titles.length);

  for (let index = 0; index < count; index += 1) {
    const chosen = index + Math.floor(random() * (titles.length - index));
    [titles[index], titles[chosen]] = [titles[chosen], titles[index]];
  }

  return titles.slice(0, count);
}
