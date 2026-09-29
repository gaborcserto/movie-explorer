import { Fragment } from 'react';
import './card.scss';
import { Link, useSearchParams } from 'react-router-dom';
import type { MovieSummary } from '@movie-explorer/contracts';
import MovieImage from '../utility/customImage';

interface CardProps {
  movie: MovieSummary;
}

function Card({ movie }: CardProps) {
  const { id, title, releaseDate, posterUrl, genres } = movie;
  const [searchParams] = useSearchParams();

  const releaseYear = releaseDate.substring(0, 4);
  const movieUrl = `/movie/${id}${
    searchParams.size ? `?${searchParams.toString()}` : ''
  }`;

  const genreLinks = genres.map((genre, index) => (
    <Fragment key={genre}>
      {index > 0 && ', '}
      <span>
        <Link
          to={`?${new URLSearchParams({
            ...Object.fromEntries(searchParams),
            filter: genre.toLowerCase(),
          }).toString()}`}
          className="card__type__link"
        >
          {genre}
        </Link>
      </span>
    </Fragment>
  ));

  return (
    <article className="card">
      <Link to={movieUrl} className="card__link" aria-label={title} />
      <div className="card__image__wrapper">
        <MovieImage src={posterUrl} alt={title} className="card__image" />
      </div>
      <div className="card__footer">
        <div className="card__footer__part">
          <span className="card__title">{title}</span>
          <p className="card__type">{genreLinks}</p>
        </div>
        <div className="card__footer__part">
          <p className="card__date">{releaseYear}</p>
        </div>
      </div>
    </article>
  );
}

export default Card;
