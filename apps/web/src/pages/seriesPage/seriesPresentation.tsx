import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type {
  CreditPerson,
  MoviePhoto,
  Ratings,
  SeasonSummary,
  SeriesDetails,
} from '@movie-explorer/contracts';

import DetailsRatings, {
  RatingsDisplay,
} from '../../components/details/ratings';
import HeroImage from '../../components/heroImage';
import DetailsMetadata from '../../components/details/metadata/detailsMetadata';
import DetailsPageLayout, {
  DetailsLowerLayout,
  DetailsHeroFrame,
} from '../../components/details/detailsPageLayout';
import { DetailError } from '../../components/details/recovery';
import { DetailHeroSkeleton } from '../../components/skeleton';
import presentApiError from '../../util/errorPresentation';
import { isNotFoundError } from '../../util/apiUtils';
import { seriesPath } from '../../util/seriesRoutes';
import seasonName from './seriesNames';
import '../../components/details/details.scss';
import './series.scss';

export function SeriesLayout({
  title,
  hero,
  navigation,
  children,
}: {
  title: string;
  hero: React.ReactNode;
  navigation?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <DetailsPageLayout title={title} hero={hero} navigation={navigation}>
      {children && <DetailsLowerLayout>{children}</DetailsLowerLayout>}
    </DetailsPageLayout>
  );
}

export function SeriesRequestState({
  valid,
  pending,
  error,
  retry,
  resource,
}: {
  valid: boolean;
  pending: boolean;
  error: unknown;
  retry: () => void;
  resource: string;
}) {
  if (!valid) {
    return (
      <DetailError
        heading={`Invalid ${resource} coordinates`}
        description="Please use a positive whole-number ID and episode number, and a nonnegative season number."
      />
    );
  }
  if (pending && !error) {
    return <DetailHeroSkeleton label={`Loading ${resource}`} />;
  }
  if (isNotFoundError(error)) {
    return (
      <DetailError
        heading={`${resource} not found`}
        description="We could not find that resource."
      />
    );
  }

  return (
    <DetailError
      {...(presentApiError(error) ?? {
        heading: 'Something went wrong',
        description: 'Please try again.',
      })}
      pending={pending}
      retry={retry}
    />
  );
}

export function SeriesRating({
  rating,
  votes,
}: {
  rating: number | null;
  votes: number | null;
}) {
  if (
    rating === null ||
    !Number.isFinite(rating) ||
    rating <= 0 ||
    rating > 10
  ) {
    return null;
  }

  const voteCount =
    votes !== null && Number.isFinite(votes) && votes > 0 ? votes : null;

  return <RatingsDisplay tmdb={rating} votes={voteCount} />;
}

export function SeriesHero({
  title,
  image,
  srcSet,
  still = false,
  imageSizes,
  seriesId,
  rating,
  votes,
  ratingsValue,
  ratingsError,
  ratingsLoading,
  retryRatings,
  showVoteCount = true,
  photos,
  className,
  children,
}: {
  title: string;
  image: string | null;
  srcSet?: string;
  still?: boolean;
  imageSizes?: string;
  seriesId?: number;
  rating?: number | null;
  votes?: number | null;
  ratingsValue?: Ratings;
  ratingsError?: boolean;
  ratingsLoading?: boolean;
  retryRatings?: () => void;
  showVoteCount?: boolean;
  photos?: MoviePhoto[];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <DetailsHeroFrame
      title={title}
      className={className}
      rating={
        seriesId === undefined ? (
          <SeriesRating rating={rating ?? null} votes={votes ?? null} />
        ) : (
          <DetailsRatings
            tmdb={rating}
            votes={votes}
            value={ratingsValue}
            error={ratingsError}
            loading={ratingsLoading}
            retry={retryRatings}
          />
        )
      }
      image={
        <HeroImage
          key={seriesId}
          src={image ?? undefined}
          srcSet={srcSet}
          fullSrcSet={srcSet}
          photos={photos}
          actionLabel={
            seriesId !== undefined
              ? `Open poster gallery for ${title}`
              : undefined
          }
          sizes={
            imageSizes ??
            (still
              ? '(max-width: 767.98px) min(500px, calc(100vw - 52px)), (max-width: 991.98px) 260px, 320px'
              : '(max-width: 767.98px) min(320px, calc(100vw - 52px)), (max-width: 991.98px) 260px, 320px')
          }
          alt={still ? `Still from ${title}` : `Poster for ${title}`}
          title={title}
          className={`movie-details__image${still ? ' movie-details__image--still' : ''}`}
        />
      }
    >
      {showVoteCount && votes !== null && votes !== undefined && (
        <p className="series-rating">{votes.toLocaleString()} votes</p>
      )}
      {children}
    </DetailsHeroFrame>
  );
}

export function SeriesFacts({
  facts,
  hero = false,
}: {
  hero?: boolean;
  facts: [string, ReactNode][];
}) {
  const entries = facts.filter(([, value]) => value !== null && value !== '');

  if (hero) {
    return (
      <div className="movie-details__information">
        <DetailsMetadata entries={entries} />
      </div>
    );
  }

  return (
    <dl className="series-facts">
      {entries.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

// Native disclosures keep long organization/person lists out of the hero flow.
export function SeriesMetadataList({
  label,
  people,
  linked = false,
}: {
  label: string;
  people: { id?: number | null; name: string }[];
  linked?: boolean;
}) {
  const content = (
    <ul className="series-people">
      {people.map((person) => (
        <li key={`${person.id ?? 'unknown'}-${person.name}`}>
          {linked && person.id ? (
            <Link className="text-link" to={`/person/${person.id}`}>
              {person.name}
            </Link>
          ) : (
            person.name
          )}
        </li>
      ))}
    </ul>
  );

  if (people.length <= 2) {
    return content;
  }

  return (
    <details className="series-metadata-disclosure">
      <summary aria-label={`${label}: ${people.length}, expand or collapse`}>
        {people
          .slice(0, 2)
          .map((person) => person.name)
          .join(', ')}{' '}
        (+{people.length - 2})
      </summary>
      <div className="series-metadata-disclosure__content">{content}</div>
    </details>
  );
}

export function ProductionCompanies({
  companies,
}: {
  companies: { id: number; name: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const previewCount = 3;
  const visibleCompanies = expanded
    ? companies
    : companies.slice(0, previewCount);

  return (
    <>
      <span>{visibleCompanies.map((company) => company.name).join(', ')}</span>
      {companies.length > previewCount && (
        <button
          className="series-metadata-toggle"
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </>
  );
}

export function EpisodeCrew({
  people,
}: {
  people: (CreditPerson & {
    department: string | null;
    jobs: string[];
  })[];
}) {
  if (people.length === 0) {
    return null;
  }

  const departments = new Map<string, typeof people>();

  people.forEach((person) => {
    const department = person.department?.trim() || 'Other';
    const departmentPeople = departments.get(department) ?? [];

    departmentPeople.push(person);
    departments.set(department, departmentPeople);
  });

  return (
    <div className="crew-groups episode-crew-groups">
      {[...departments].map(([department, departmentPeople]) => (
        <section className="crew-group" key={department}>
          <h4>{department}</h4>
          <ul className="crew-group__people">
            {departmentPeople.map((person) => (
              <li
                key={`${person.id ?? `${department}:${person.name}`}:${person.jobs.join('|')}`}
              >
                {person.id ? (
                  <Link
                    to={`/person/${person.id}`}
                    className="person-credit-link text-link"
                  >
                    {person.name}
                  </Link>
                ) : (
                  person.name
                )}
                {person.jobs.length > 0 && (
                  <span>{` — ${person.jobs.join(', ')}`}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function SeriesBreadcrumbs({ children }: { children: React.ReactNode }) {
  return (
    <nav aria-label="Breadcrumb" className="series-breadcrumbs">
      <ol>{children}</ol>
    </nav>
  );
}

export function SeasonSelector({
  seriesId,
  series,
  seasons,
  currentSeason,
}: {
  seriesId: number;
  series: SeriesDetails;
  seasons: SeasonSummary[];
  currentSeason: SeasonSummary;
}) {
  const [open, setOpen] = useState(false);
  const selectorId = useId();
  const selectorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const availableSeasons = seasons.some(
    (season) => season.seasonNumber === currentSeason.seasonNumber
  )
    ? seasons
    : [...seasons, currentSeason];

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !selectorRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div className="series-season-selector" ref={selectorRef}>
      <button
        ref={triggerRef}
        type="button"
        className="series-season-selector__trigger"
        aria-expanded={open}
        aria-controls={selectorId}
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          {seasonName(currentSeason.seasonNumber, currentSeason.title)}
        </span>
        <span className="series-season-selector__chevron" aria-hidden="true" />
      </button>
      <ul
        id={selectorId}
        className="series-season-selector__options"
        data-open={open}
        aria-hidden={!open}
        inert={!open}
      >
        {availableSeasons.map((season) => (
          <li key={season.id}>
            {season.seasonNumber === currentSeason.seasonNumber ? (
              <span aria-current="page">
                {seasonName(season.seasonNumber, season.title)}
              </span>
            ) : (
              <Link
                className="text-link"
                to={seriesPath(seriesId, season.seasonNumber)}
                state={{ series }}
              >
                {seasonName(season.seasonNumber, season.title)}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SeasonName({
  number,
  title,
}: {
  number: number;
  title?: string;
}) {
  return seasonName(number, title);
}
