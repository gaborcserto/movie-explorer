import { useEffect, useState } from 'react';
import type { ImdbRating } from '@movie-explorer/contracts';
import { SiImdb, SiThemoviedatabase } from 'react-icons/si';
import { getImdbRating } from '../../util/apiUtils';
import './ratings.scss';

export function RatingsDisplay({
  tmdb,
  votes,
  imdb,
}: {
  tmdb?: number | null;
  votes?: number | null;
  imdb?: ImdbRating | null;
}) {
  const ratings = [
    { label: 'TMDB', Icon: SiThemoviedatabase, score: tmdb, voteCount: votes },
    {
      label: 'IMDb',
      Icon: SiImdb,
      score: imdb?.score,
      voteCount: imdb?.voteCount,
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
  kind,
  id,
  tmdb,
  votes,
}: {
  kind: 'movie' | 'series';
  id: number;
  tmdb?: number | null;
  votes?: number | null;
}) {
  const key = `${kind}:${id}`;
  const [result, setResult] = useState<{
    key: string;
    rating: ImdbRating | null;
  }>();
  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve()
      .then(() => getImdbRating(kind, id, controller.signal))
      .then((response) => {
        if (!controller.signal.aborted)
          setResult({ key, rating: response.imdb });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ key, rating: null });
      });
    return () => controller.abort();
  }, [kind, id, key]);

  return (
    <RatingsDisplay
      tmdb={tmdb}
      votes={votes}
      imdb={result?.key === key ? result.rating : null}
    />
  );
}
