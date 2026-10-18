import { Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  MovieCastMember,
  MovieDetails,
  MovieSection,
  MovieDirector,
  MovieVideo,
} from '@movie-explorer/contracts';
import SectionRecovery from './sectionRecovery';
import PhotoPreview from './photoPreview';
import VideoLightbox from './videoLightbox';
import HeroImage from './heroImage';
import MovieMetadata from './movieMetadata';
import CastPreview from './castPreview';
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
  const groupPeople = (
    members: (MovieDirector & { roles?: string[] })[],
    category: string
  ): PersonCredit[] => {
    const byId = new Map<number, PersonCredit>();
    const unlinkedByName = new Map<string, PersonCredit>();
    const people: PersonCredit[] = [];
    members.forEach((person, index) => {
      if (!person.name.trim()) return;
      let credit = hasPersonId(person.id) ? byId.get(person.id) : undefined;
      if (!hasPersonId(person.id) && category !== 'cast')
        credit = unlinkedByName.get(person.name.trim());
      if (!credit) {
        credit = {
          ...person,
          name: person.name.trim(),
          key: hasPersonId(person.id)
            ? `person-${person.id}`
            : `${category}-${index}`,
          roles: [],
        };
        people.push(credit);
        if (hasPersonId(person.id)) byId.set(person.id, credit);
        else if (category !== 'cast') unlinkedByName.set(credit.name, credit);
      }
      credit.profileUrl ||= person.profileUrl;
      credit.profileSrcSet ||= person.profileSrcSet;
      (person.roles ?? []).forEach((role) => {
        const label = role.trim();
        if (label && !credit.roles.includes(label)) credit.roles.push(label);
      });
    });
    return people;
  };
  const directors = groupPeople(movie.directors ?? [], 'director');
  const writers = groupPeople(movie.writers ?? [], 'writer');
  const producers = groupPeople(movie.producers ?? [], 'producer');
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
  const cast = groupPeople(
    castMembers.map((person) => ({
      ...person,
      roles: person.character ? [person.character] : [],
    })),
    'cast'
  );
  return {
    directors,
    writers,
    producers,
    cast,
  };
}

function CreditNames({ people }: { people: PersonCredit[] }) {
  return people.map((person) => (
    <Fragment key={person.key}>
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

function CrewGroup({
  label,
  people,
}: {
  label: string;
  people: PersonCredit[];
}) {
  const headingId = `crew-${label.toLowerCase()}-heading`;
  const groupClass = `crew-group crew-group--${label.toLowerCase()}`;
  return (
    <section className={groupClass} aria-labelledby={headingId}>
      <h3 id={headingId}>{label}</h3>
      <ul className="crew-group__people">
        {people.map((person) => (
          <li key={person.key}>
            <CreditNames people={[person]} />
          </li>
        ))}
      </ul>
    </section>
  );
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
  } = movieData;
  const releaseYear = releaseDate ? /^\d{4}/.exec(releaseDate)?.[0] : undefined;
  const genresData = genres.map((genre) => genre.trim()).filter(Boolean);
  const overview = description?.trim();
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
        sizes="(max-width: 767.98px) min(320px, calc(100vw - 52px)), (max-width: 991.98px) 260px, 320px"
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
        <MovieMetadata movie={movieData} />
      </div>
    </div>
  );
}

export function DetailsLowerContent({
  movieData,
  recoverSection,
}: LowerDetailsProps) {
  const {
    title,
    photos = [],
    backdrops = photos,
    posters = [],
    videos = [],
  } = movieData;
  const [visibleVideoCount, setVisibleVideoCount] = useState(4);
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);
  const lastVideoRef = useRef<HTMLElement>(null);
  const focusLastVideo = useRef(false);
  const rememberLastVideo = (element: HTMLElement | null) => {
    lastVideoRef.current = element;
  };
  useEffect(() => {
    setVisibleVideoCount(4);
    setSelectedVideo(null);
    focusLastVideo.current = false;
  }, [movieData.id]);
  useEffect(() => {
    if (!focusLastVideo.current) return;
    focusLastVideo.current = false;
    lastVideoRef.current?.focus({ preventScroll: true });
  }, [visibleVideoCount]);
  const { cast, directors, writers, producers } = getPersonCredits(movieData);
  const crewGroups = [
    { label: 'Directors', people: directors },
    { label: 'Writers', people: writers },
    { label: 'Producers', people: producers },
  ].filter((group) => group.people.length > 0);
  const showCastSection = cast.length > 0 || Boolean(movieData.sections);
  const showCrewSection =
    crewGroups.length > 0 || movieData.sections?.credits.status === 'available';
  const visiblePhotos = backdrops.filter((photo) => photo.fullUrl?.trim());
  const videoEntries = videos.map((video) => ({
    video,
    videoId: getYouTubeVideoId(video.url),
  }));
  const supportedVideos = videoEntries.filter(isSupportedVideo);
  const lastVisibleVideoIndex =
    Math.min(visibleVideoCount, videoEntries.length) - 1;

  return (
    <div className="movie-details__lower">
      <div className="container movie-details__lower-content">
        {(showCastSection || showCrewSection) && (
          <div
            className={`cast-crew-layout${
              showCastSection !== showCrewSection
                ? ' cast-crew-layout--single'
                : ''
            }`}
          >
            {showCastSection && (
              <section
                className="details-section"
                aria-labelledby="cast-heading"
              >
                <div className="details-section__heading">
                  <h2 id="cast-heading">Cast</h2>
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
                  cast.length === 0 && <p>No cast available.</p>}
                <CastPreview key={movieData.id} members={cast} />
              </section>
            )}

            {showCrewSection && (
              <section
                className="details-section"
                aria-labelledby="crew-heading"
              >
                <div className="details-section__heading">
                  <h2 id="crew-heading">Crew</h2>
                </div>
                {crewGroups.length === 0 && <p>No crew available.</p>}
                <div className="crew-groups">
                  {crewGroups.map(({ label, people }) => (
                    <CrewGroup key={label} label={label} people={people} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {(visiblePhotos.length > 0 ||
          posters.length > 0 ||
          videos.length > 0 ||
          movieData.sections) && (
          <section
            className="details-section media-section"
            aria-labelledby="media-heading"
          >
            <h2 id="media-heading">Media</h2>
            {(visiblePhotos.length > 0 || movieData.sections) && (
              <div className="media-block">
                <h3>Backdrops</h3>
                <SectionRecovery
                  label="Backdrops"
                  availability={movieData.sections?.photos}
                  recover={(signal) =>
                    recoverSection
                      ? recoverSection('photos', signal)
                      : Promise.reject(new Error('Recovery unavailable'))
                  }
                />
                {movieData.sections?.photos.status === 'available' &&
                  visiblePhotos.length === 0 && <p>No backdrops available.</p>}
                <PhotoPreview
                  photos={visiblePhotos}
                  title={title}
                  category="backdrops"
                  resetKey={movieData.id}
                />
              </div>
            )}
            {(posters.length > 0 || movieData.sections?.posters) && (
              <div className="media-block">
                <h3>Posters</h3>
                <SectionRecovery
                  label="Posters"
                  availability={movieData.sections?.posters}
                  recover={(signal) =>
                    recoverSection
                      ? recoverSection('posters', signal)
                      : Promise.reject(new Error('Recovery unavailable'))
                  }
                />
                {movieData.sections?.posters?.status === 'available' &&
                  posters.length === 0 && <p>No posters available.</p>}
                <PhotoPreview
                  photos={posters}
                  title={title}
                  portrait
                  category="posters"
                  resetKey={movieData.id}
                />
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
                <div className="media-preview__summary">
                  <span>
                    {videos.length} {videos.length === 1 ? 'video' : 'videos'}{' '}
                    available
                  </span>
                  {visibleVideoCount < videos.length && (
                    <button
                      type="button"
                      className="btn btn--outline btn--action media-preview__action"
                      aria-controls="movie-video-grid"
                      aria-label="Show more videos"
                      onClick={() => {
                        focusLastVideo.current =
                          visibleVideoCount + 4 >= videos.length;
                        setVisibleVideoCount((count) => count + 4);
                      }}
                    >
                      Show more
                    </button>
                  )}
                </div>
                <div className="video-grid" id="movie-video-grid">
                  {videoEntries.slice(0, visibleVideoCount).map((entry) => {
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

                    if (playerIndex >= 0)
                      return (
                        <button
                          type="button"
                          className="video-tile"
                          aria-label={`Play ${label}`}
                          key={`${video.url}-${video.name}`}
                          ref={
                            entry === videoEntries[lastVisibleVideoIndex]
                              ? rememberLastVideo
                              : undefined
                          }
                          onClick={() => setSelectedVideo(playerIndex)}
                        >
                          {content}
                        </button>
                      );
                    if (video.url)
                      return (
                        <a
                          className="video-tile"
                          href={video.url}
                          title={label}
                          target="_blank"
                          rel="noreferrer"
                          key={`${video.url}-${video.name}`}
                          ref={
                            entry === videoEntries[lastVisibleVideoIndex]
                              ? rememberLastVideo
                              : undefined
                          }
                        >
                          {content}
                        </a>
                      );
                    return (
                      <div
                        className="video-tile"
                        key={`${video.site}-${video.key}`}
                        ref={
                          entry === videoEntries[lastVisibleVideoIndex]
                            ? rememberLastVideo
                            : undefined
                        }
                        tabIndex={-1}
                      >
                        {content}
                        <p>
                          Playback unavailable for {video.site || 'this site'}.
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
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
