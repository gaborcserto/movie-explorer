import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  MovieCastMember,
  MovieDetails,
  MovieSection,
  MovieDirector,
  MovieVideo,
} from '@movie-explorer/contracts';
import SectionRecovery from './sectionRecovery';
import PhotoLightbox from './photoLightbox';
import VideoLightbox from './videoLightbox';
import HeroImage from './heroImage';
import MovieImage from '../utility/customImage';
import './media.scss';

interface DetailsProps {
  movieData: MovieDetails;
}

interface LowerDetailsProps {
  movieData: MovieDetails;
  recoverSection?: (
    section: MovieSection,
    signal: AbortSignal
  ) => Promise<void>;
}

interface PersonCredit extends MovieDirector {
  key: string;
  roles: string[];
}

function hasPersonId(id: number | undefined): id is number {
  return id !== undefined && Number.isSafeInteger(id) && id > 0;
}

function getPersonCredits(movie: MovieDetails) {
  const peopleById = new Map<number, PersonCredit>();
  const directors: PersonCredit[] = [];
  const writers: PersonCredit[] = [];
  const producers: PersonCredit[] = [];
  const cast: PersonCredit[] = [];
  const addCredit = (person: MovieDirector, key: string, role?: string) => {
    let credit = hasPersonId(person.id) ? peopleById.get(person.id) : undefined;
    if (!credit) {
      credit = { ...person, name: person.name.trim(), key, roles: [] };
      if (hasPersonId(person.id)) {
        credit.key = `person-${person.id}`;
        peopleById.set(person.id, credit);
      }
    }
    credit.profileUrl ||= person.profileUrl;
    credit.profileSrcSet ||= person.profileSrcSet;
    const label = role?.trim();
    if (label && !credit.roles.includes(label)) credit.roles.push(label);
    return credit;
  };
  (movie.directors ?? []).forEach((person, index) => {
    if (!person.name.trim()) return;
    const credit = addCredit(person, `director-${index}`, 'Director');
    if (!directors.includes(credit)) directors.push(credit);
  });
  const addCrew = (
    members: MovieDetails['writers'],
    category: string,
    target: PersonCredit[]
  ) => {
    (members ?? []).forEach((person, index) => {
      if (!person.name.trim()) return;
      const credit = addCredit(person, `${category}-${index}`);
      person.roles.forEach((role) => {
        const label = role.trim();
        if (label && !credit.roles.includes(label)) credit.roles.push(label);
      });
      if (!target.includes(credit)) target.push(credit);
    });
  };
  addCrew(movie.writers, 'writer', writers);
  addCrew(movie.producers, 'producer', producers);
  const structuredCast = (movie.castMembers ?? []).filter((person) =>
    person.name.trim()
  );
  // Keep legacy names missing from a partial structured response as plain text.
  // Consume occurrences only for display; names never supply or merge identities.
  const legacyNames = movie.cast.map((name) => name.trim()).filter(Boolean);
  structuredCast.forEach((person) => {
    const index = legacyNames.indexOf(person.name.trim());
    if (index >= 0) legacyNames.splice(index, 1);
  });
  const castMembers: MovieCastMember[] = [
    ...structuredCast,
    ...legacyNames.map((name) => ({ name })),
  ];
  castMembers.forEach((person, index) => {
    if (!person.name.trim()) return;
    const credit = addCredit(person, `cast-${index}`, person.character);
    if (!cast.includes(credit)) cast.push(credit);
  });
  return {
    directors,
    writers,
    producers,
    cast,
    cards: [
      ...new Set([...cast.slice(0, 6), ...directors, ...writers, ...producers]),
    ],
  };
}

function CreditNames({
  people,
  separator = ' · ',
}: {
  people: PersonCredit[];
  separator?: string;
}) {
  return people.map((person, index) => (
    <Fragment key={person.key}>
      {index > 0 && separator}
      {hasPersonId(person.id) ? (
        <Link to={`/person/${person.id}`} className="person-credit-link">
          {person.name}
        </Link>
      ) : (
        person.name
      )}
    </Fragment>
  ));
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
  } = movieData;
  const releaseYear = releaseDate ? /^\d{4}/.exec(releaseDate)?.[0] : undefined;
  const genresData = genres.map((genre) => genre.trim()).filter(Boolean);
  const overview = description?.trim();
  const directorName = director?.trim();
  const { directors, writers, producers, cast } = getPersonCredits(movieData);
  const hasRuntime =
    runtimeMinutes !== undefined &&
    Number.isFinite(runtimeMinutes) &&
    runtimeMinutes > 0;
  const hasRating =
    rating !== undefined && Number.isFinite(rating) && rating > 0;

  return (
    <div className="movie-details__container">
      <HeroImage
        src={posterUrl}
        srcSet={posterSrcSet}
        previewSrc={posterPreviewUrl}
        alt={title}
        title={title}
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
        {(directors.length > 0 ||
          directorName ||
          writers.length > 0 ||
          producers.length > 0 ||
          cast.length > 0) && (
          <section className="movie-details__section">
            <h2 className="movie-details__section-title">Credits</h2>
            <dl className="movie-details__credits">
              {cast.length > 0 && (
                <div>
                  <dt>Cast</dt>
                  <dd>
                    <CreditNames people={cast} />
                  </dd>
                </div>
              )}
              {(directors.length > 0 || directorName) && (
                <div>
                  <dt>Director</dt>
                  <dd>
                    {directors.length > 0 ? (
                      <CreditNames people={directors} separator=", " />
                    ) : (
                      directorName
                    )}
                  </dd>
                </div>
              )}
              {writers.length > 0 && (
                <div>
                  <dt>Writer</dt>
                  <dd>
                    <CreditNames people={writers} separator=", " />
                  </dd>
                </div>
              )}
              {producers.length > 0 && (
                <div>
                  <dt>Producer</dt>
                  <dd>
                    <CreditNames people={producers} separator=", " />
                  </dd>
                </div>
              )}
            </dl>
          </section>
        )}
      </div>
    </div>
  );
}

export function DetailsLowerContent({
  movieData,
  recoverSection,
}: LowerDetailsProps) {
  const { title, photos = [], videos = [] } = movieData;
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);
  const { cards } = getPersonCredits(movieData);
  const visiblePhotos = photos.filter((photo) => photo.fullUrl?.trim());
  const videoEntries = videos.map((video) => ({
    video,
    videoId: getYouTubeVideoId(video.url),
  }));
  const supportedVideos = videoEntries.filter(isSupportedVideo);

  return (
    <div className="movie-details__lower">
      <div className="container movie-details__lower-content">
        {(cards.length > 0 || movieData.sections) && (
          <section className="details-section" aria-labelledby="cast-heading">
            <div className="details-section__heading">
              <h2 id="cast-heading">Cast &amp; Crew</h2>
            </div>
            <SectionRecovery
              label="Credits"
              availability={movieData.sections?.credits}
              recover={(signal) =>
                recoverSection
                  ? recoverSection('credits', signal)
                  : Promise.reject(new Error('Recovery unavailable'))
              }
            />
            {movieData.sections?.credits.status === 'available' &&
              cards.length === 0 && <p>No cast or crew available.</p>}
            <div className="cast-grid">
              {cards.map((member) => {
                const content = (
                  <>
                    <MovieImage
                      src={member.profileUrl}
                      srcSet={member.profileSrcSet}
                      alt={member.name}
                      className="cast-member__image"
                    />
                    <div>
                      <h3>{member.name}</h3>
                      {member.roles.length > 0 && (
                        <p>{member.roles.join(' · ')}</p>
                      )}
                    </div>
                  </>
                );
                return (
                  <article className="cast-member" key={member.key}>
                    {hasPersonId(member.id) ? (
                      <Link
                        to={`/person/${member.id}`}
                        className="cast-member__link"
                        aria-label={member.name}
                      >
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {(visiblePhotos.length > 0 ||
          videos.length > 0 ||
          movieData.sections) && (
          <section
            className="details-section media-section"
            aria-labelledby="media-heading"
          >
            <h2 id="media-heading">Media</h2>
            {(visiblePhotos.length > 0 || movieData.sections) && (
              <div className="media-block">
                <h3>Photos</h3>
                <SectionRecovery
                  label="Photos"
                  availability={movieData.sections?.photos}
                  recover={(signal) =>
                    recoverSection
                      ? recoverSection('photos', signal)
                      : Promise.reject(new Error('Recovery unavailable'))
                  }
                />
                {movieData.sections?.photos.status === 'available' &&
                  visiblePhotos.length === 0 && <p>No photos available.</p>}
                <div className="photo-grid">
                  {visiblePhotos.map((photo, index) => (
                    <button
                      type="button"
                      className="photo-tile"
                      key={photo.fullUrl}
                      aria-label={`View ${title} photo ${index + 1}`}
                      onClick={() => setSelectedPhoto(index)}
                    >
                      <MovieImage
                        src={photo.thumbnailUrl}
                        alt={photo.alt ?? `${title} still ${index + 1}`}
                        className="media-thumbnail"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(videos.length > 0 || movieData.sections) && (
              <div className="media-block">
                <h3>Videos &amp; Trailers</h3>
                <SectionRecovery
                  label="Videos"
                  availability={movieData.sections?.videos}
                  recover={(signal) =>
                    recoverSection
                      ? recoverSection('videos', signal)
                      : Promise.reject(new Error('Recovery unavailable'))
                  }
                />
                {movieData.sections?.videos.status === 'available' &&
                  videos.length === 0 && <p>No videos available.</p>}
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
                        <MovieImage
                          src={video.thumbnailUrl}
                          alt=""
                          className="media-thumbnail"
                        />
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
