import { useTranslation } from 'react-i18next';
import { useCallback, useLayoutEffect } from 'react';
import type {
  PersonListResponse,
  PersonSummary,
} from '@movie-explorer/contracts';

import { formatNumber } from '../../../i18n/format';
import { i18n } from '../../../i18n';
import presentApiError from '../../../util/errorPresentation';
import { getPeople } from '../../../util/apiUtils';
import Card from '../../card';
import { ResultsSkeleton, CardSkeletons } from '../../skeleton';
import Error from '../../../layouts/error';
import { useResultHistory, useSearchHistory } from '../useSearchHistory';
import usePaginatedResults from '../hooks/usePaginatedResults';

const peopleItems = (response: PersonListResponse) => response.people;

const personKey = (person: PersonSummary) => person.id;

export default function PeopleList({ query }: { query: string }) {
  useTranslation();

  const history = useSearchHistory();
  const { restored, save } = useResultHistory(history?.people, query);

  const fetchPage = useCallback(
    (page: number, signal: AbortSignal) => getPeople(query, page, signal),
    [query]
  );

  const {
    data,
    items: people,
    visible,
    setVisible,
    loading,
    error,
    moreError,
    load,
  } = usePaginatedResults(restored, fetchPage, peopleItems, personKey);

  useLayoutEffect(() => {
    if (data) {
      save({ data, items: people, visible });
    }
  }, [save, data, people, visible]);

  if (loading && !data && !error) {
    return <ResultsSkeleton />;
  }

  if (error) {
    return (
      <Error
        className="list__container container"
        title={presentApiError(error)?.heading}
        message={presentApiError(error)?.description ?? ''}
        pending={loading}
        actionLabel={i18n.t('ui.try_again')}
        onAction={() => load(1)}
      />
    );
  }

  const more =
    data &&
    (visible < people.length || data.page < Math.min(data.totalPages, 500));
  const buttonLabel = moreError
    ? i18n.t('ui.try_again')
    : i18n.t('ui.load_more');
  let emptyMessage = query
    ? i18n.t('messages.noPeople', { query })
    : i18n.t('ui.no_people_available');

  if (data?.totalResults) {
    emptyMessage = more
      ? i18n.t('ui.no_matching_persons_yet_load_more_to_continue')
      : i18n.t('ui.no_matching_persons_found');
  }

  return (
    <section
      className="list__container container"
      aria-label={i18n.t('ui.people_results')}
      aria-busy={loading}
    >
      <div className="list__summary" aria-live="polite">
        <p className="list__loaded">
          {formatNumber(Math.min(visible, people.length))}{' '}
          {i18n.t('ui.people_loaded')}
        </p>
      </div>
      {!loading && people.length === 0 && <p role="status">{emptyMessage}</p>}
      <div className="list__items">
        {people.slice(0, visible).map((person) => (
          <Card
            key={person.id}
            movie={{
              id: person.id,
              title: person.name,
              posterUrl: person.profileUrl ?? '',
              genres: [],
            }}
            destination={`/person/${person.id}`}
            subtitle={person.knownForDepartment}
            genreNavigation={false}
          />
        ))}
        {loading && <CardSkeletons count={10} />}
      </div>
      {Boolean(moreError) && (
        <p role="alert">{presentApiError(moreError)?.description}</p>
      )}
      {more && (
        <div className="list__more">
          <button
            type="button"
            className="btn btn--outline btn--action"
            disabled={loading}
            onClick={() => {
              if (visible < people.length) {
                setVisible((current) => current + 10);
              } else {
                load(data.page + 1, Math.min(visible, people.length));
              }
            }}
          >
            {loading ? i18n.t('ui.loading_more_label') : buttonLabel}
          </button>
        </div>
      )}
    </section>
  );
}
