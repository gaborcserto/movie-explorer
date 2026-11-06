import { useTranslation } from 'react-i18next';
import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import type {
  MovieDetails,
  MovieSection,
  WatchProvider,
  Ratings,
} from '@movie-explorer/contracts';

import { genreLabel } from '../../i18n/labels';
import { i18n } from '../../i18n';
import DetailsRatings from './ratings';
import DetailRecommendations from '../detailRecommendations';
import { SectionRecovery } from './recovery';
import { MediaSection } from './media';
import HeroImage from '../heroImage';
import MovieMetadata from './metadata';
import CastPreview, { useCrewPreview } from './credits';
import {
  getMoviePersonCredits,
  hasPersonId,
  type MoviePersonCredit,
} from './credits/personCredits';
import { DetailsHeroFrame, DetailsLowerLayout } from './detailsPageLayout';
import './media/media.scss';
import WatchProviders from './watchProviders';
import type useWatchProvidersResource from './watchProviders/useWatchProvidersResource';
import PersonalLibraryActions from '../../features/library/personalLibraryActions';

interface DetailsProps {
  movieData: MovieDetails;
  watchProviders?: WatchProvider[];
  providerResource?: ReturnType<typeof useWatchProvidersResource>;
  ratings?: Ratings;
  ratingsLoading?: boolean;
}

interface LowerDetailsProps {
  movieData: MovieDetails;
  recoverSection?: (
    section: MovieSection,
    signal: AbortSignal
  ) => Promise<void>;
}

function CreditNames({ people }: { people: MoviePersonCredit[] }) {
  useTranslation();

  return people.map((person) => (
    <Fragment key={person.key}>
      {hasPersonId(person.id) ? (
        <Link
          to={`/person/${person.id}`}
          className="person-credit-link text-link"
        >
          {person.name}
        </Link>
      ) : (
        person.name
      )}
    </Fragment>
  ));
}

function CrewGroup({
  groupKey,
  label,
  people,
  measurement = false,
}: {
  groupKey: string;
  label: string;
  people: MoviePersonCredit[];
  measurement?: boolean;
}) {
  useTranslation();

  const headingId = `crew-${groupKey}-heading`;
  const groupClass = `crew-group crew-group--${groupKey}`;

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
  groups: { key: string; label: string; people: MoviePersonCredit[] }[];
  visibleKeys: string[];
  groupId: string;
  measurement?: boolean;
}) {
  useTranslation();

  const visiblePeople = new Set(visibleKeys);

  return (
    <div className="crew-groups" id={measurement ? undefined : groupId}>
      {groups.map(({ key: groupKey, label, people: groupPeople }) => {
        const visible = measurement
          ? groupPeople
          : groupPeople.filter((person) => visiblePeople.has(person.key));

        return visible.length > 0 ? (
          <CrewGroup
            key={groupKey}
            groupKey={groupKey}
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
  ratingsLoading,
}: DetailsProps) {
  useTranslation();

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
            alt:
              poster.alt ??
              i18n.t('messages.posterNumber', { number: index + 1, title }),
          }))}
          sizes="(max-width: 767.98px) min(320px, calc(100vw - 52px)), (max-width: 991.98px) 260px, 320px"
          alt={title}
          title={title}
          actionLabel={i18n.t('messages.openPosters', { title })}
          className="movie-details__image"
        />
      }
      rating={
        <DetailsRatings
          tmdb={rating !== undefined && rating > 0 ? rating : null}
          value={ratings}
          loading={ratingsLoading}
        />
      }
    >
      {genresData.length > 0 && (
        <div className="movie-details__genre">
          {genresData.map(genreLabel).join(', ')}
        </div>
      )}
      <div className="movie-details__facts-actions">
        {(releaseYear || hasRuntime) && (
          <div className="movie-details__data">
            {releaseYear && <span>{releaseYear}</span>}
            {hasRuntime && (
              <span>
                {runtimeMinutes} {i18n.t('messages.minuteUnit')}
              </span>
            )}
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
          <h2 className="movie-details__section-title">
            {i18n.t('ui.overview')}
          </h2>
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
  useTranslation();

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
    { key: 'directors', label: i18n.t('ui.directors'), people: directors },
    { key: 'writers', label: i18n.t('ui.writers'), people: writers },
    { key: 'producers', label: i18n.t('ui.producers'), people: producers },
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
                <h2 id="cast-heading">{i18n.t('ui.cast')}</h2>
              </div>
              <SectionRecovery
                label={i18n.t('ui.credits')}
                availability={movieData.sections?.credits}
                recover={(signal) =>
                  recoverSection
                    ? recoverSection('credits', signal)
                    : Promise.reject(
                        new Error(i18n.t('ui.recovery_unavailable'))
                      )
                }
              />
              {movieData.sections?.credits.status === 'available' &&
                cast.length === 0 && <p>{i18n.t('ui.no_cast_available')}</p>}
              <CastPreview
                key={movieData.id}
                members={cast}
                responsiveInitialCounts={{
                  tabletAndMobile: 10,
                  desktop: 12,
                  wideDesktop: 12,
                }}
              />
            </section>
          )}

          {showCrewSection && (
            <section
              className="details-section movie-crew-section"
              aria-labelledby="crew-heading"
            >
              <div className="details-section__heading">
                <h2 id="crew-heading">{i18n.t('ui.crew')}</h2>
              </div>
              {crewGroups.length === 0 && (
                <p>{i18n.t('ui.no_crew_available')}</p>
              )}
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
                  <h2>{i18n.t('ui.crew')}</h2>
                </div>
                <p className="cast-count">
                  {i18n.t('messages.shownCount', {
                    shown: crewPeople.length,
                    count: crewPeople.length,
                    kind: i18n.t('ui.crew_members'),
                  })}
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
            label={i18n.t('ui.backdrops')}
            availability={movieData.sections?.photos}
            recover={(signal) =>
              recoverSection
                ? recoverSection('photos', signal)
                : Promise.reject(new Error(i18n.t('ui.recovery_unavailable')))
            }
          />
        }
        postersRecovery={
          <SectionRecovery
            label={i18n.t('ui.posters')}
            availability={movieData.sections?.posters}
            recover={(signal) =>
              recoverSection
                ? recoverSection('posters', signal)
                : Promise.reject(new Error(i18n.t('ui.recovery_unavailable')))
            }
          />
        }
        videosRecovery={
          <SectionRecovery
            label={i18n.t('ui.videos')}
            availability={movieData.sections?.videos}
            recover={(signal) =>
              recoverSection
                ? recoverSection('videos', signal)
                : Promise.reject(new Error(i18n.t('ui.recovery_unavailable')))
            }
          />
        }
      />
      <DetailRecommendations resource="movies" id={movieData.id} />
    </DetailsLowerLayout>
  );
}

export default DetailsHero;
