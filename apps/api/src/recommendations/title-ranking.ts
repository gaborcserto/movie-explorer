import type { RecommendationTitle } from '@movie-explorer/contracts';

/** Internal ranking metadata; never part of the public card contract. */
export interface TitleSignals {
  genreIds?: readonly number[];
  rating?: number;
  voteCount?: number;
  year?: number;
  popularity?: number;
}

function confidence(signals: TitleSignals): number {
  const votes = signals.voteCount;

  return votes !== undefined && Number.isFinite(votes) && votes >= 0
    ? votes / (votes + 100)
    : 0;
}

function validRating(signals: TitleSignals): number | undefined {
  const rating = signals.rating;

  return rating !== undefined &&
    Number.isFinite(rating) &&
    rating > 0 &&
    rating <= 10
    ? rating
    : undefined;
}

export function genreSimilarity(
  source: TitleSignals,
  candidate: TitleSignals,
): number {
  const sourceGenres = new Set(source.genreIds);
  const candidateGenres = new Set(candidate.genreIds);

  if (!sourceGenres.size || !candidateGenres.size) {
    return 0.5;
  }

  const shared = [...sourceGenres].filter((id) =>
    candidateGenres.has(id),
  ).length;

  // Source coverage matters most; extra candidate genres are only a soft cost.
  return (
    (0.7 * shared) / sourceGenres.size + (0.3 * shared) / candidateGenres.size
  );
}

export function scoreTitle(
  source: TitleSignals,
  candidate: TitleSignals,
  rank: number,
): number {
  const rating = validRating(candidate);
  const sourceRating = validRating(source);
  const certainty = confidence(candidate);
  const quality =
    rating === undefined ? 0.5 : 0.5 + certainty * (rating / 10 - 0.5);
  const proximity =
    rating === undefined || sourceRating === undefined
      ? 0.5
      : 0.5 +
        Math.min(certainty, confidence(source)) *
          (Math.max(0, 1 - Math.abs(sourceRating - rating) / 5) - 0.5);
  const era =
    source.year && candidate.year
      ? 1 / (1 + Math.abs(source.year - candidate.year) / 20)
      : 0.5;
  const popularity =
    candidate.popularity !== undefined &&
    Number.isFinite(candidate.popularity) &&
    candidate.popularity >= 0
      ? candidate.popularity / (candidate.popularity + 100)
      : 0.5;
  const relevance = 1 / (1 + Math.max(0, rank) / 10);

  return (
    0.35 * genreSimilarity(source, candidate) +
    0.3 * relevance +
    0.2 * (0.6 * quality + 0.4 * proximity) +
    0.1 * era +
    0.05 * (0.7 * certainty + 0.3 * popularity)
  );
}

export function rankTitles(
  source: TitleSignals,
  titles: readonly RecommendationTitle[],
  signals: ReadonlyMap<number, TitleSignals>,
) {
  return titles
    .map((title, rank) => ({
      title,
      rank,
      score: scoreTitle(source, signals.get(title.id) ?? {}, rank),
    }))
    .sort(
      (a, b) => b.score - a.score || a.rank - b.rank || a.title.id - b.title.id,
    );
}
