import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  MovieDetails,
  MovieSection,
  WatchProvider,
  Ratings,
} from '@movie-explorer/contracts';

import DetailsRatings from './ratings';
import { SectionRecovery } from './recovery';
import { MediaSection } from './media';
import HeroImage from '../heroImage';
import MovieMetadata from './metadata';
import CastPreview from './credits';
import useCrewPreview from './credits/useCrewPreview';
import {
  getMoviePersonCredits,
  hasPersonId,
  type MoviePersonCredit,
} from './credits/personCredits';
import { DetailsHeroFrame, DetailsLowerLayout } from './detailsPageLayout';
import './media/media.scss';
import WatchProviders from './watchProviders';
import type useWatchProvidersResource from './useWatchProvidersResource';
import PersonalLibraryActions from '../../features/library/personalLibraryActions';

interface DetailsProps {
  movieData: MovieDetails;
  watchProviders?: WatchProvider[];
  providerResource?: ReturnType<typeof useWatchProvidersResource>;
  ratings?: Ratings;
  ratingsError?: boolean;
  ratingsLoading?: boolean;
  retryRatings?: () => void;
}

interface LowerDetailsProps {
  movieData: MovieDetails;
  recoverSection?: (
    section: MovieSection,
    signal: AbortSignal
  ) => Promise<void>;
}

function CreditNames({ people }: { people: MoviePersonCredit[] }) {
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
  measurement = false,
}: {
  label: string;
  people: MoviePersonCredit[];
  measurement?: boolean;
}) {
  const headingId = `crew-${label.toLowerCase()}-heading`;
  const groupClass = `crew-group crew-group--${label.toLowerCase()}`;

  return (
    <section
      className={groupClass}
      aria-labelledby={measurement ? undefined : headingId}
    >
      <h3 id={measurement ? undefined : headingId}>{label}</h3>
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

function CrewGroups({
  groups,
  visibleKeys,
  groupId,
  measurement = false,
}: {
  groups: { label: string; people: MoviePersonCredit[] }[];
  visibleKeys: string[];
  groupId: string;
  measurement?: boolean;
}) {
  const visiblePeople = new Set(visibleKeys);

  return (
    <div className="crew-groups" id={measurement ? undefined : groupId}>
      {groups.map(({ label, people: groupPeople }) => {
        const visible = measurement
          ? groupPeople
          : groupPeople.filter((person) => visiblePeople.has(person.key));

        return visible.length > 0 ? (
          <CrewGroup
            key={label}
            label={label}
            people={visible}
            measurement={measurement}
          />
        ) : null;
      })}
    </div>
  );
}

export function DetailsHero({
  movieData,
  watchProviders = [],
  providerResource,
  ratings,
  ratingsError,
  ratingsLoading,
  retryRatings,
}: DetailsProps) {
  const {
    title,
    releaseDate,
    posterUrl,
    posterSrcSet,
    posterPreviewUrl,
    posters = [],
    genres,
    rating,
    runtimeMinutes,
  } = movieData;
  const releaseYear = releaseDate ? /^\d{4}/.exec(releaseDate)?.[0] : undefined;
  const genresData = genres.map((genre) => genre.trim()).filter(Boolean);
  const hasRuntime =
    runtimeMinutes !== undefined &&
    Number.isFinite(runtimeMinutes) &&
    runtimeMinutes > 0;

  return (
    <DetailsHeroFrame
      title={title}
      image={
        <HeroImage
          key={movieData.id}
          src={posterUrl}
          srcSet={posterSrcSet}
          previewSrc={posterPreviewUrl}
          photos={posters.map((poster, index) => ({
            ...poster,
            alt: poster.alt ?? `Poster ${index + 1} for ${title}`,
          }))}
          sizes="(max-width: 767.98px) min(320px, calc(100vw - 52px)), (max-width: 991.98px) 260px, 320px"
          alt={title}
          title={title}
          actionLabel={`Open poster gallery for ${title}`}
          className="movie-details__image"
        />
      }
      rating={
        <DetailsRatings
          tmdb={rating !== undefined && rating > 0 ? rating : null}
          value={ratings}
          error={ratingsError}
          loading={ratingsLoading}
          retry={retryRatings}
        />
      }
    >
      {genresData.length > 0 && (
        <div className="movie-details__genre">{genresData.join(', ')}</div>
      )}
      <div className="movie-details__facts-actions">
        {(releaseYear || hasRuntime) && (
          <div className="movie-details__data">
            {releaseYear && <span>{releaseYear}</span>}
            {hasRuntime && <span>{runtimeMinutes} min</span>}
          </div>
        )}
        <PersonalLibraryActions
          mediaType="movie"
          id={movieData.id}
          title={title}
          posterUrl={posterUrl}
          releaseDate={releaseDate}
          presentation="expanded"
        />
      </div>
      {movieData.description?.trim() && (
        <section className="movie-details__section">
          <h2 className="movie-details__section-title">Overview</h2>
          <p className="movie-details__overview">{movieData.description}</p>
        </section>
      )}
      <MovieMetadata movie={movieData} />
      <WatchProviders providers={watchProviders} resource={providerResource} />
    </DetailsHeroFrame>
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
  const { cast, directors, writers, producers } =
    getMoviePersonCredits(movieData);
  const crewGroups = [
    { label: 'Directors', people: directors },
    { label: 'Writers', people: writers },
    { label: 'Producers', people: producers },
  ].filter((group) => group.people.length > 0);
  const showCastSection = cast.length > 0 || Boolean(movieData.sections);
  const showCrewSection =
    crewGroups.length > 0 || movieData.sections?.credits.status === 'available';
  const crewPeople = [
    ...new Set(
      crewGroups.flatMap((group) => group.people.map((person) => person.key))
    ),
  ];
  const castSectionRef = useRef<HTMLElement>(null);
  const crewMeasurementRef = useRef<HTMLElement>(null);
  const [crewFitsCast, setCrewFitsCast] = useState(false);

  useLayoutEffect(() => {
    const breakpoint = window.matchMedia?.('(min-width: 992px)');
    const measure = () => {
      const castSection = castSectionRef.current;
      const crewMeasurement = crewMeasurementRef.current;
      const castHeight = castSection?.getBoundingClientRect().height ?? 0;
      const crewHeight = crewMeasurement?.getBoundingClientRect().height ?? 0;
      const fits = Boolean(
        cast.length > 0 &&
        (breakpoint?.matches ?? window.innerWidth >= 992) &&
        castHeight > 0 &&
        crewHeight > 0 &&
        crewHeight <= castHeight
      );
      setCrewFitsCast((current) => (current === fits ? current : fits));
    };

    measure();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measure);

    if (castSectionRef.current) {
      observer?.observe(castSectionRef.current);
    }
    if (crewMeasurementRef.current) {
      observer?.observe(crewMeasurementRef.current);
    }

    breakpoint?.addEventListener('change', measure);

    return () => {
      observer?.disconnect();
      breakpoint?.removeEventListener('change', measure);
    };
  }, [cast.length, crewPeople.length, movieData.id]);

  const crewPreview = useCrewPreview(crewPeople, movieData.id, crewFitsCast);
  const visiblePhotos = backdrops.filter((photo) => photo.fullUrl?.trim());

  return (
    <DetailsLowerLayout>
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
              ref={castSectionRef}
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
              className="details-section movie-crew-section"
              aria-labelledby="crew-heading"
            >
              <div className="details-section__heading">
                <h2 id="crew-heading">Crew</h2>
              </div>
              {crewGroups.length === 0 && <p>No crew available.</p>}
              {crewPreview.summary}
              <CrewGroups
                groups={crewGroups}
                visibleKeys={crewPreview.visible}
                groupId={crewPreview.groupId}
              />
              {crewPreview.controls}
              <section
                ref={crewMeasurementRef}
                className="details-section movie-crew-measurement"
                aria-hidden="true"
                inert
              >
                <div className="details-section__heading">
                  <h2>Crew</h2>
                </div>
                <p className="cast-count">
                  Showing {crewPeople.length} of {crewPeople.length} crew
                  members
                </p>
                <CrewGroups
                  groups={crewGroups}
                  visibleKeys={crewPeople}
                  groupId={crewPreview.groupId}
                  measurement
                />
              </section>
            </section>
          )}
        </div>
      )}

      <MediaSection
        title={title}
        resetKey={movieData.id}
        backdrops={visiblePhotos}
        posters={posters}
        videos={videos}
        availability={{
          backdrops: movieData.sections?.photos,
          posters: movieData.sections?.posters,
          videos: movieData.sections?.videos,
        }}
        backdropsRecovery={
          <SectionRecovery
            label="Backdrops"
            availability={movieData.sections?.photos}
            recover={(signal) =>
              recoverSection
                ? recoverSection('photos', signal)
                : Promise.reject(new Error('Recovery unavailable'))
            }
          />
        }
        postersRecovery={
          <SectionRecovery
            label="Posters"
            availability={movieData.sections?.posters}
            recover={(signal) =>
              recoverSection
                ? recoverSection('posters', signal)
                : Promise.reject(new Error('Recovery unavailable'))
            }
          />
        }
        videosRecovery={
          <SectionRecovery
            label="Videos"
            availability={movieData.sections?.videos}
            recover={(signal) =>
              recoverSection
                ? recoverSection('videos', signal)
                : Promise.reject(new Error('Recovery unavailable'))
            }
          />
        }
      />
    </DetailsLowerLayout>
  );
}

export default DetailsHero;
