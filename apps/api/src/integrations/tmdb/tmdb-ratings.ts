import type { RatingResult } from '@movie-explorer/contracts';

export function normalizeTmdbRating(
  score: unknown,
  voteCount: unknown,
): RatingResult {
  if (
    typeof score !== 'number' ||
    !Number.isFinite(score) ||
    score < 0 ||
    score > 10 ||
    !(
      voteCount === undefined ||
      (typeof voteCount === 'number' &&
        Number.isSafeInteger(voteCount) &&
        voteCount >= 0)
    )
  ) {
    return { status: 'unavailable', reason: 'invalid-response' };
  }

  return {
    status: 'available',
    score,
    voteCount: typeof voteCount === 'number' ? voteCount : null,
  };
}
