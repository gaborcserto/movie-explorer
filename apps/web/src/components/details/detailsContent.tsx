import { useState } from 'react';
import type {
  MovieCastMember,
  MovieDetails,
  MovieVideo,
} from '@movie-explorer/contracts';
import PhotoLightbox from './photoLightbox';
import VideoLightbox from './videoLightbox';
import MovieImage from '../utility/customImage';
import './media.scss';

interface DetailsProps {
  movieData: MovieDetails;
}

type SupportedVideo = { video: MovieVideo; videoId: string };

function getYouTubeVideoId(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const isYouTubeHost =
      hostname === 'youtube.com' ||
      hostname.endsWith('.youtube.com') ||
      hostname === 'youtu.be';
    if (!isYouTubeHost) return undefined;

    const [firstSegment, secondSegment] = parsed.pathname
      .split('/')
      .filter(Boolean);
    let candidate: string | null | undefined;
    if (hostname === 'youtu.be') candidate = firstSegment;
    else if (parsed.pathname === '/watch')
      candidate = parsed.searchParams.get('v');
    else if (['embed', 'shorts', 'live'].includes(firstSegment ?? ''))
      candidate = secondSegment;

    return candidate && /^[\w-]{11}$/.test(candidate) ? candidate : undefined;
  } catch {
    return undefined;
  }
}

function isSupportedVideo(entry: {
  video: MovieVideo;
  videoId: string | undefined;
}): entry is SupportedVideo {
  return entry.videoId !== undefined;
}

export function DetailsHero({ movieData }: DetailsProps) {
  const {
    title,
    releaseDate,
    posterUrl,
    posterSrcSet,
    posterPreviewUrl,
    genres,
    rating,
    runtimeMinutes,
    description,
    director,
    cast,
  } = movieData;
  const releaseYear = releaseDate ? /^\d{4}/.exec(releaseDate)?.[0] : undefined;
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
        srcSet={posterSrcSet}
        previewSrc={posterPreviewUrl}
        loading="eager"
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
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);
  const visibleCast: MovieCastMember[] = castMembers.length
    ? castMembers
    : cast.map((name) => ({ name }));
  const visiblePhotos = photos.filter(
    (photo) => photo.thumbnailUrl && photo.fullUrl
  );
  const videoEntries = videos.map((video) => ({
    video,
    videoId: getYouTubeVideoId(video.url),
  }));
  const supportedVideos = videoEntries.filter(isSupportedVideo);

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
                    srcSet={member.profileSrcSet}
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
                  {videoEntries.map((entry) => {
                    const { video, videoId } = entry;
                    const label = video.name || 'Video';
                    const playerIndex = videoId
                      ? supportedVideos.findIndex(
                          (supportedVideo) => supportedVideo === entry
                        )
                      : -1;
                    const content = (
                      <>
                        {video.thumbnailUrl && (
                          <img src={video.thumbnailUrl} alt="" loading="lazy" />
                        )}
                        <span>{label}</span>
                      </>
                    );

                    return playerIndex >= 0 ? (
                      <button
                        type="button"
                        className="video-tile"
                        aria-label={`Play ${label}`}
                        key={`${video.url}-${video.name}`}
                        onClick={() => setSelectedVideo(playerIndex)}
                      >
                        {content}
                      </button>
                    ) : (
                      <a
                        className="video-tile"
                        href={video.url}
                        title={label}
                        target="_blank"
                        rel="noreferrer"
                        key={`${video.url}-${video.name}`}
                      >
                        {content}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {selectedPhoto !== null && (
          <PhotoLightbox
            photos={visiblePhotos}
            initialIndex={selectedPhoto}
            title={title}
            onClose={() => setSelectedPhoto(null)}
          />
        )}
        {selectedVideo !== null && (
          <VideoLightbox
            videos={supportedVideos}
            initialIndex={selectedVideo}
            title={title}
            onClose={() => setSelectedVideo(null)}
          />
        )}
      </div>
    </div>
  );
}

export default DetailsHero;
