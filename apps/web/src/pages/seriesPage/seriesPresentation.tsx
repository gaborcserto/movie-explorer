import type { ReactNode } from 'react';

import { DetailsMetadata } from '../../components/details/metadata';
import DetailsPageLayout, {
  DetailsLowerLayout,
} from '../../components/details/detailsPageLayout';
import { DetailError } from '../../components/details/recovery';
import { DetailHeroSkeleton } from '../../components/skeleton';
import presentApiError from '../../util/errorPresentation';
import { isNotFoundError } from '../../util/apiUtils';
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

export function SeriesBreadcrumbs({ children }: { children: React.ReactNode }) {
  return (
    <nav aria-label="Breadcrumb" className="series-breadcrumbs">
      <ol>{children}</ol>
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
  return seasonName(number, title);
}
