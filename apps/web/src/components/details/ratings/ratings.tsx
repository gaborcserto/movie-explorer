import { useTranslation } from 'react-i18next';
import type { RatingResult, Ratings } from '@movie-explorer/contracts';
import { SiImdb, SiThemoviedatabase } from 'react-icons/si';

import { i18n } from '../../../i18n';

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
  useTranslation();

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
            aria-label={i18n.t('messages.rating', {
              label,
              score: new Intl.NumberFormat(i18n.language, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }).format(Number((score ?? 0).toFixed(1))),
              votes:
                voteCount != null
                  ? i18n.t('messages.votes', { count: voteCount })
                  : '',
            })}
          >
            <Icon className="details-ratings__icon" aria-hidden="true" />
            <span className="details-ratings__score">
              {new Intl.NumberFormat(i18n.language, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }).format(Number((score ?? 0).toFixed(1)))}
            </span>
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
  loading = false,
}: {
  tmdb?: number | null;
  votes?: number | null;
  value?: Ratings;
  loading?: boolean;
}) {
  useTranslation();

  const fallback: RatingResult =
    typeof tmdb === 'number' && Number.isFinite(tmdb) && tmdb >= 0 && tmdb <= 10
      ? { status: 'available', score: tmdb, voteCount: votes ?? null }
      : { status: 'missing' };

  return (
    <>
      <RatingsDisplay tmdb={value?.tmdb ?? fallback} imdb={value?.imdb} />
      {loading && (
        <span className="visually-hidden" role="status">
          {i18n.t('ui.loading_ratings')}
        </span>
      )}
    </>
  );
}
