import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { CreditPerson } from '@movie-explorer/contracts';
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
import Loading from '../../layouts/loading';
import presentApiError from '../../util/errorPresentation';
import { isNotFoundError } from '../../util/apiUtils';
import '../../components/details/details.scss';
import './series.scss';

export function SeriesLayout({
  title,
  hero,
  navigation,
  backdrop,
  children,
}: {
  title: string;
  hero: React.ReactNode;
  navigation?: React.ReactNode;
  backdrop?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <DetailsPageLayout
      title={title}
      hero={hero}
      navigation={navigation}
      backdrop={backdrop}
    >
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
    return <Loading className="series-loading" title={`Loading ${resource}`} />;
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

export function SeriesHero({
  title,
  image,
  srcSet,
  still = false,
  seriesId,
  rating,
  votes,
  children,
}: {
  title: string;
  image: string | null;
  srcSet?: string;
  still?: boolean;
  seriesId?: number;
  rating?: number | null;
  votes?: number | null;
  children: React.ReactNode;
}) {
  return (
    <DetailsHeroFrame
      title={title}
      rating={
        seriesId === undefined ? (
          <RatingsDisplay tmdb={rating} votes={votes} />
        ) : (
          <DetailsRatings
            kind="series"
            id={seriesId}
            tmdb={rating}
            votes={votes}
          />
        )
      }
      image={
        <HeroImage
          src={image ?? undefined}
          srcSet={srcSet}
          fullSrcSet={srcSet}
          sizes={
            still
              ? '(max-width: 767.98px) min(500px, calc(100vw - 52px)), (max-width: 991.98px) 260px, 320px'
              : '(max-width: 767.98px) min(320px, calc(100vw - 52px)), (max-width: 991.98px) 260px, 320px'
          }
          alt={still ? `Still from ${title}` : `Poster for ${title}`}
          title={title}
          className={`movie-details__image${still ? ' movie-details__image--still' : ''}`}
        />
      }
    >
      {votes !== null && votes !== undefined && (
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

export function SeriesRating({
  rating,
  votes,
}: {
  rating: number | null;
  votes: number | null;
}) {
  if (rating === null) {
    return null;
  }

  return (
    <p
      className="series-rating"
      aria-label={`TMDB rating ${rating} out of 10${votes !== null ? ` from ${votes} votes` : ''}`}
    >
      <strong>{rating.toFixed(1)} / 10</strong> TMDB{' '}
      {votes !== null && <span>({votes.toLocaleString()} votes)</span>}
    </p>
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
            <Link to={`/person/${person.id}`}>{person.name}</Link>
          ) : (
            person.name
          )}
        </li>
      ))}
    </ul>
  );
  if (people.length <= 2) return content;
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

export function SeriesPeople({
  people,
}: {
  people: (CreditPerson & {
    characters?: string[];
    jobs?: string[];
    department?: string | null;
  })[];
}) {
  return (
    <ul className="series-people">
      {people.map((person) => (
        <li
          key={`${person.id ?? person.name}:${person.department ?? ''}:${(person.characters ?? person.jobs ?? []).join(',')}`}
        >
          {person.id ? (
            <Link to={`/person/${person.id}`}>{person.name}</Link>
          ) : (
            person.name
          )}
          {person.characters?.length || person.jobs?.length
            ? ` — ${(person.characters ?? person.jobs ?? []).join(', ')}`
            : null}
        </li>
      ))}
    </ul>
  );
}

export function SeriesBreadcrumbs({ children }: { children: React.ReactNode }) {
  return (
    <nav aria-label="Breadcrumb" className="series-breadcrumbs">
      {children}
    </nav>
  );
}

export function SeasonName({
  number,
  title,
}: {
  number: number;
  title?: string;
}) {
  const label = number === 0 ? 'Specials' : `Season ${number}`;

  return (
    <>
      {label}
      {title && title.toLowerCase() !== label.toLowerCase() ? `: ${title}` : ''}
    </>
  );
}
