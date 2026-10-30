import { useCallback, useLayoutEffect } from 'react';
import type {
  PersonListResponse,
  PersonSummary,
} from '@movie-explorer/contracts';

import presentApiError from '../../util/errorPresentation';
import { getPeople } from '../../util/apiUtils';
import Card from '../card';
import { ResultsSkeleton, CardSkeletons } from '../skeleton';
import Error from '../../layouts/error';
import { useResultHistory, useSearchHistory } from './useSearchHistory';

import usePaginatedResults from './hooks/usePaginatedResults';

const peopleItems = (response: PersonListResponse) => response.people;

const personKey = (person: PersonSummary) => person.id;

export default function PeopleList({ query }: { query: string }) {
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
        actionLabel="Try again"
        onAction={() => load(1)}
      />
    );
  }
  const more =
    data &&
    (visible < people.length || data.page < Math.min(data.totalPages, 500));
  const buttonLabel = moreError ? 'Try again' : 'Load more';
  let emptyMessage = query
    ? `No people found for "${query}".`
    : 'No people available.';

  if (data?.totalResults) {
    emptyMessage = more
      ? 'No matching persons yet. Load more to continue.'
      : 'No matching persons found.';
  }

  return (
    <section
      className="list__container container"
      aria-label="People results"
      aria-busy={loading}
    >
      <div className="list__summary" aria-live="polite">
        <p className="list__loaded">
          {Math.min(visible, people.length)} people loaded
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
            {loading ? 'Loading more...' : buttonLabel}
          </button>
        </div>
      )}
    </section>
  );
}
