import { useEffect, useRef, useState } from 'react';
import type { MovieCastMember, MovieDetails } from '@movie-explorer/contracts';
import MovieImage from '../utility/customImage';
import './media.scss';

interface DetailsProps {
  movieData: MovieDetails;
}

export function DetailsHero({ movieData }: DetailsProps) {
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
              aria-label={`Rating ${rating.toFixed(1)} out of 10`}
            >
              {rating.toFixed(1)}
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

export function DetailsLowerContent({ movieData }: DetailsProps) {
  const { title, cast, castMembers = [], photos = [], videos = [] } = movieData;
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const visibleCast: MovieCastMember[] = castMembers.length
    ? castMembers
    : cast.map((name) => ({ name }));
  const visiblePhotos = photos.filter(
    (photo) => photo.thumbnailUrl && photo.fullUrl
  );

  useEffect(() => {
    if (selectedPhoto === null) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedPhoto(null);
      if (event.key === 'ArrowLeft')
        setSelectedPhoto((index) =>
          index === null
            ? null
            : (index - 1 + visiblePhotos.length) % visiblePhotos.length
        );
      if (event.key === 'ArrowRight')
        setSelectedPhoto((index) =>
          index === null ? null : (index + 1) % visiblePhotos.length
        );
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedPhoto, visiblePhotos.length]);

  return (
    <div className="movie-details__lower">
      <div className="container movie-details__lower-content">
        {visibleCast.length > 0 && (
          <section className="details-section" aria-labelledby="cast-heading">
            <div className="details-section__heading">
              <h2 id="cast-heading">Cast &amp; Crew</h2>
            </div>
            <div className="cast-grid">
              {visibleCast.map((member) => (
                <article
                  className="cast-member"
                  key={`${member.name}-${member.character ?? ''}`}
                >
                  <MovieImage
                    src={member.profileUrl}
                    alt={member.name}
                    className="cast-member__image"
                  />
                  <div>
                    <h3>{member.name}</h3>
                    {member.character && <p>{member.character}</p>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {(visiblePhotos.length > 0 || videos.length > 0) && (
          <section
            className="details-section media-section"
            aria-labelledby="media-heading"
          >
            <h2 id="media-heading">Media</h2>
            {visiblePhotos.length > 0 && (
              <div className="media-block">
                <h3>Photos</h3>
                <div className="photo-grid">
                  {visiblePhotos.map((photo, index) => (
                    <button
                      type="button"
                      className="photo-tile"
                      key={photo.thumbnailUrl}
                      onClick={() => setSelectedPhoto(index)}
                    >
                      <img
                        src={photo.thumbnailUrl}
                        alt={photo.alt ?? `${title} still ${index + 1}`}
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {videos.length > 0 && (
              <div className="media-block">
                <h3>Videos &amp; Trailers</h3>
                <div className="video-grid">
                  {videos.map((video) => (
                    <a
                      className="video-tile"
                      href={video.url}
                      title={video.name}
                      target="_blank"
                      rel="noreferrer"
                      key={video.url}
                    >
                      {video.thumbnailUrl && (
                        <img src={video.thumbnailUrl} alt="" loading="lazy" />
                      )}
                      <span>{video.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {selectedPhoto !== null && (
          <div
            className="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`${title} photo viewer`}
            tabIndex={-1}
            ref={dialogRef}
          >
            <button
              type="button"
              className="lightbox__close"
              aria-label="Close photo viewer"
              onClick={() => setSelectedPhoto(null)}
            >
              ×
            </button>
            {visiblePhotos.length > 1 && (
              <>
                <button
                  type="button"
                  className="lightbox__nav lightbox__nav--previous"
                  aria-label="Previous photo"
                  onClick={() =>
                    setSelectedPhoto(
                      (selectedPhoto - 1 + visiblePhotos.length) %
                        visiblePhotos.length
                    )
                  }
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="lightbox__nav lightbox__nav--next"
                  aria-label="Next photo"
                  onClick={() =>
                    setSelectedPhoto((selectedPhoto + 1) % visiblePhotos.length)
                  }
                >
                  ›
                </button>
              </>
            )}
            <img
              src={visiblePhotos[selectedPhoto].fullUrl}
              alt={
                visiblePhotos[selectedPhoto].alt ??
                `${title} still ${selectedPhoto + 1}`
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default DetailsHero;
