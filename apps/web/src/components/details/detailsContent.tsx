import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  MovieCastMember,
  MovieDetails,
  MovieSection,
  MovieDirector,
  WatchProvider,
  Ratings,
} from '@movie-explorer/contracts';

import DetailsRatings from './ratings';
import { SectionRecovery } from './recovery';
import PhotoPreview, { VideoPreview } from './media';
import HeroImage from '../heroImage';
import MovieMetadata from './metadata';
import CastPreview from './credits';
import useCrewPreview from './credits/useCrewPreview';
import { DetailsHeroFrame, DetailsLowerLayout } from './detailsPageLayout';
import './media/media.scss';
import WatchProviders from './watchProviders';

interface DetailsProps {
  movieData: MovieDetails;
  watchProviders?: WatchProvider[];
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
      if (!person.name.trim()) {
        return;
      }

      let credit = hasPersonId(person.id) ? byId.get(person.id) : undefined;
      if (!hasPersonId(person.id) && category !== 'cast') {
        credit = unlinkedByName.get(person.name.trim());
      }

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
        if (hasPersonId(person.id)) {
          byId.set(person.id, credit);
        } else if (category !== 'cast') {
          unlinkedByName.set(credit.name, credit);
        }
      }

      credit.profileUrl ||= person.profileUrl;
      credit.profileSrcSet ||= person.profileSrcSet;

      (person.roles ?? []).forEach((role) => {
        const label = role.trim();

        if (label && !credit.roles.includes(label)) {
          credit.roles.push(label);
        }
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
    if (index >= 0) {
      legacyNames.splice(index, 1);
    }
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
  measurement = false,
}: {
  label: string;
  people: PersonCredit[];
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
  groups: { label: string; people: PersonCredit[] }[];
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
          src={posterUrl}
          srcSet={posterSrcSet}
          previewSrc={posterPreviewUrl}
          sizes="(max-width: 767.98px) min(320px, calc(100vw - 52px)), (max-width: 991.98px) 260px, 320px"
          alt={title}
          title={title}
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
      {(releaseYear || hasRuntime) && (
        <div className="movie-details__data">
          {releaseYear && <span>{releaseYear}</span>}
          {hasRuntime && <span>{runtimeMinutes} min</span>}
        </div>
      )}
      <MovieMetadata movie={movieData} />
      <WatchProviders providers={watchProviders} />
      {movieData.description?.trim() && (
        <section className="movie-details__section">
          <h2 className="movie-details__section-title">Overview</h2>
          <p className="movie-details__overview">
            {movieData.description.trim()}
          </p>
        </section>
      )}
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
  const { cast, directors, writers, producers } = getPersonCredits(movieData);
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
              <VideoPreview
                videos={videos}
                title={title}
                resetKey={movieData.id}
              />
            </div>
          )}
        </section>
      )}
    </DetailsLowerLayout>
  );
}

export default DetailsHero;
