import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

import { i18n } from '../../i18n';
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
  useTranslation();

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
  resource: 'series' | 'season' | 'episode' | 'Series' | 'Season' | 'Episode';
}) {
  useTranslation();

  if (!valid) {
    return (
      <DetailError
        heading={i18n.t('messages.invalidResource', {
          resource: i18n.t(`resources.${resource}`),
        })}
        description={i18n.t(
          'ui.please_use_a_positive_whole_number_id_and_episode_number_and_a_nonnegative_season_number'
        )}
      />
    );
  }
  if (pending && !error) {
    return (
      <DetailHeroSkeleton
        label={i18n.t('messages.loadingResource', {
          resource: i18n.t(`resources.${resource}`),
        })}
      />
    );
  }
  if (isNotFoundError(error)) {
    return (
      <DetailError
        heading={i18n.t('messages.resourceMissing', {
          resource: i18n.t(`resources.${resource}`),
        })}
        description={i18n.t('ui.we_could_not_find_that_resource')}
      />
    );
  }

  return (
    <DetailError
      {...(presentApiError(error) ?? {
        heading: i18n.t('ui.something_went_wrong'),
        description: i18n.t('ui.please_try_again'),
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
  useTranslation();

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
  useTranslation();

  return (
    <nav aria-label={i18n.t('ui.breadcrumb')} className="series-breadcrumbs">
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
  useTranslation();

  return seasonName(number, title);
}
