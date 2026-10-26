import type { RatingResult, Ratings } from '@movie-explorer/contracts';
import { SiImdb, SiThemoviedatabase } from 'react-icons/si';

import './ratings.scss';

function normalizedRating(
  rating:
    | RatingResult
    | number
    | { score: number; voteCount: number | null }
    | null
    | undefined,
  votes?: number | null
): RatingResult | undefined {
  if (typeof rating === 'number') {
    return { status: 'available', score: rating, voteCount: votes ?? null };
  }
  if (!rating) {
    return undefined;
  }

  if ('status' in rating) {
    return rating;
  }

  return { status: 'available', ...rating };
}

export function RatingsDisplay({
  tmdb,
  votes,
  imdb,
}: {
  tmdb?: RatingResult | number | null;
  votes?: number | null;
  imdb?: RatingResult | { score: number; voteCount: number | null } | null;
}) {
  const tmdbResult = normalizedRating(tmdb, votes);
  const imdbResult = normalizedRating(imdb);
  const tmdbScore =
    tmdbResult?.status === 'available' ? tmdbResult.score : undefined;
  const imdbScore =
    imdbResult?.status === 'available' ? imdbResult.score : undefined;
  const ratings = [
    {
      label: 'TMDB',
      Icon: SiThemoviedatabase,
      score: tmdbScore,
      voteCount:
        tmdbResult?.status === 'available' ? tmdbResult.voteCount : null,
    },
    {
      label: 'IMDb',
      Icon: SiImdb,
      score: imdbScore,
      voteCount:
        imdbResult?.status === 'available' ? imdbResult.voteCount : null,
    },
  ].filter(
    (rating) =>
      typeof rating.score === 'number' &&
      Number.isFinite(rating.score) &&
      rating.score > 0 &&
      rating.score <= 10
  );

  return (
    <div className="details-ratings">
      <div className="details-ratings__scores">
        {ratings.map(({ label, Icon, score, voteCount }) => (
          <div
            className="details-ratings__item"
            key={label}
            role="img"
            aria-label={`${label} rating: ${score?.toFixed(1)} out of 10${voteCount !== null && voteCount !== undefined ? ` from ${voteCount} votes` : ''}`}
          >
            <Icon className="details-ratings__icon" aria-hidden="true" />
            <span className="details-ratings__score">{score?.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DetailsRatings({
  tmdb,
  votes,
  value,
  error = false,
  loading = false,
  retry,
}: {
  tmdb?: number | null;
  votes?: number | null;
  value?: Ratings;
  error?: boolean;
  loading?: boolean;
  retry?: () => void;
}) {
  const fallback: RatingResult =
    typeof tmdb === 'number' && Number.isFinite(tmdb) && tmdb >= 0 && tmdb <= 10
      ? { status: 'available', score: tmdb, voteCount: votes ?? null }
      : { status: 'missing' };

  return (
    <>
      <RatingsDisplay tmdb={value?.tmdb ?? fallback} imdb={value?.imdb} />
      {loading && (
        <span className="visually-hidden" role="status">
          Loading ratings
        </span>
      )}
      {(error ||
        value?.tmdb.status === 'unavailable' ||
        value?.imdb.status === 'unavailable') && (
        <div className="details-ratings__error" role="status">
          <span>
            {error
              ? 'Ratings could not be loaded.'
              : 'One or more ratings are unavailable.'}
          </span>{' '}
          {retry && (
            <button type="button" onClick={retry}>
              Retry ratings
            </button>
          )}
        </div>
      )}
    </>
  );
}
