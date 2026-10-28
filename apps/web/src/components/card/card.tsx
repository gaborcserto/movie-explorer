import { Fragment } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { MovieSummary } from '@movie-explorer/contracts';

import MovieImage from '../utility/customImage';
import { getPosterDisplaySrcSet } from '../../util/imageSizing';
import PersonalLibraryActions from '../../features/library/personalLibraryActions';
import type { LibraryMediaType } from '../../features/library/libraryStore';
import './card.scss';

interface CardProps {
  movie: MovieSummary;
  loading?: 'lazy' | 'eager';
  destination?: string;
  subtitle?: string;
  displayDate?: string;
  genreNavigation?: boolean;
  libraryMedia?: { mediaType: LibraryMediaType; firstAirDate?: string | null };
  rating?: string;
  onLibraryMembershipRemoved?: () => void;
}

function Card({
  movie,
  loading = 'lazy',
  destination,
  subtitle,
  displayDate,
  genreNavigation = true,
  libraryMedia,
  rating,
  onLibraryMembershipRemoved,
}: CardProps) {
  const { id, title, releaseDate, posterUrl, posterSrcSet, genres } = movie;
  const [searchParams] = useSearchParams();

  const releaseYear = (displayDate ?? releaseDate)?.substring(0, 4);
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
      <Link
        to={destination ?? movieUrl}
        className="card__link"
        aria-label={title}
      />
      <div className="card__image__wrapper">
        <MovieImage
          src={posterUrl}
          srcSet={getPosterDisplaySrcSet(posterUrl, posterSrcSet)}
          sizes={loading === 'lazy' ? 'auto, 300px' : '300px'}
          loading={loading}
          alt={title}
          className="card__image"
        />
      </div>
      <div className="card__footer">
        {(libraryMedia || releaseYear) && (
          <div className="card__metadata-row">
            {libraryMedia && (
              <PersonalLibraryActions
                mediaType={libraryMedia.mediaType}
                id={id}
                title={title}
                posterUrl={posterUrl}
                releaseDate={releaseDate}
                firstAirDate={libraryMedia.firstAirDate}
                presentation="compact"
                onMembershipRemoved={onLibraryMembershipRemoved}
              />
            )}
            {releaseYear && <p className="card__date">{releaseYear}</p>}
          </div>
        )}
        <div className="card__footer__part">
          <span className="card__title">{title}</span>
          <p
            className={`card__type${genreNavigation ? '' : ' card__type--static'}`}
          >
            {genreNavigation ? genreLinks : genres.join(', ')}
          </p>
          {subtitle && <p className="card__subtitle">{subtitle}</p>}
        </div>
        {rating && <p className="card__subtitle card__rating">{rating}</p>}
      </div>
    </article>
  );
}

export default Card;
