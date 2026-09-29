import type { MovieDetails } from '@movie-explorer/contracts';
import MovieImage from '../utility/customImage';

interface DetailsProps {
  movieData: MovieDetails;
}
function DetailsContent({ movieData }: DetailsProps) {
  const {
    title,
    releaseDate,
    posterUrl,
    genres,
    rating,
    runtimeMinutes,
    description,
    director,
    cast,
  } = movieData;

  const releaseYear = /^\d{4}/.exec(releaseDate)?.[0];
  const genresData = genres.map((genre) => genre.trim()).filter(Boolean);
  const overview = description?.trim();
  const directorName = director?.trim();
  const castNames = cast.map((name) => name.trim()).filter(Boolean);
  const hasRuntime =
    runtimeMinutes !== undefined &&
    Number.isFinite(runtimeMinutes) &&
    runtimeMinutes > 0;
  const hasRating =
    rating !== undefined && Number.isFinite(rating) && rating > 0;

  return (
    <div className="movie-details__container">
      <MovieImage
        src={posterUrl}
        alt={title}
        className="movie-details__image"
      />
      <div className="movie-details__content">
        <div className="movie-details__title__wrapper">
          <h1 className="movie-details__title">{title}</h1>
          {hasRating && (
            <div
              className="movie-details__rating"
              aria-label={`Rating ${rating} out of 10`}
            >
              {rating}
            </div>
          )}
        </div>
        {genresData.length > 0 && (
          <div className="movie-details__genre">{genresData.join(', ')}</div>
        )}
        {(releaseYear || hasRuntime) && (
          <div className="movie-details__data">
            {releaseYear && <span>{releaseYear}</span>}
            {hasRuntime && <span>{runtimeMinutes} min</span>}
          </div>
        )}
        {overview && (
          <section className="movie-details__section">
            <h2 className="movie-details__section-title">Overview</h2>
            <p className="movie-details__overview">{overview}</p>
          </section>
        )}
        {(directorName || castNames.length > 0) && (
          <section className="movie-details__section">
            <h2 className="movie-details__section-title">Credits</h2>
            <dl className="movie-details__credits">
              {directorName && (
                <div>
                  <dt>Director</dt>
                  <dd>{directorName}</dd>
                </div>
              )}
              {castNames.length > 0 && (
                <div>
                  <dt>Cast</dt>
                  <dd>{castNames.join(' · ')}</dd>
                </div>
              )}
            </dl>
          </section>
        )}
      </div>
    </div>
  );
}

export default DetailsContent;
