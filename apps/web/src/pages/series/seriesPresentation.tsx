import { Link } from 'react-router-dom';
import type { CreditPerson } from '@movie-explorer/contracts';

import HeroImage from '../../components/heroImage';
import HeaderSearch from '../../components/search/headerSearch';
import { DetailError } from '../../components/details/recovery';
import useDetailPage from '../../components/details/hooks';
import Loading from '../../layouts/loading';
import Footer from '../../layouts/footer';
import presentApiError from '../../util/errorPresentation';
import { isNotFoundError } from '../../util/apiUtils';
import '../../components/details/details.scss';
import './series.scss';

export function SeriesLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const mainRef = useDetailPage(title);

  return (
    <div className="detail-page series-page">
      <header className="detail-page__navigation container">
        <div className="detail-header movie-details__top">
          <Link to="/search" className="brand">
            <strong>Movie</strong> Explorer
          </Link>
          <HeaderSearch />
        </div>
      </header>
      <main
        ref={mainRef}
        tabIndex={-1}
        aria-label={title}
        className="container series-page__main"
      >
        {children}
      </main>
      <Footer />
    </div>
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
  children,
}: {
  title: string;
  image: string | null;
  srcSet?: string;
  still?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`series-hero${still ? ' series-hero--episode' : ''}`}>
      <HeroImage
        src={image ?? undefined}
        srcSet={srcSet}
        alt={still ? `Still from ${title}` : `Poster for ${title}`}
        title={title}
        className="series-hero__image"
      />
      <div className="series-hero__content">
        <h1 className="movie-details__title">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function SeriesFacts({
  facts,
}: {
  facts: [string, string | number | null][];
}) {
  return (
    <dl className="series-facts">
      {facts
        .filter(([, value]) => value !== null && value !== '')
        .map(([label, value]) => (
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
