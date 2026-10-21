import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type {
  PersonListResponse,
  PersonSummary,
} from '@movie-explorer/contracts';
import presentApiError, {
  isCancelledError,
} from '../../util/errorPresentation';
import { getPeople } from '../../util/apiUtils';
import Card from '../card/card';
import Loading from '../../layouts/loading';
import Error from '../../layouts/error';
import { useResultHistory, useSearchHistory } from './useSearchHistory';

export default function PeopleList({ query }: { query: string }) {
  const history = useSearchHistory();
  const { restored, save } = useResultHistory(history?.people, query);
  const [data, setData] = useState<PersonListResponse | undefined>(
    restored?.data
  );
  const [people, setPeople] = useState<PersonSummary[]>(restored?.items ?? []);
  const [visible, setVisible] = useState(restored?.visible ?? 10);
  const [loading, setLoading] = useState(!restored);
  const [error, setError] = useState<unknown>(null);
  const [moreError, setMoreError] = useState<unknown>(null);
  const controller = useRef<AbortController | null>(null);
  const busy = useRef(false);

  const load = useCallback(
    async (page: number, revealed = 0) => {
      if (busy.current) return;
      busy.current = true;
      controller.current?.abort();
      const request = new AbortController();
      controller.current = request;
      setLoading(true);
      setMoreError(null);
      try {
        const response = await getPeople(query, page, request.signal);
        if (request.signal.aborted) return;
        setError(null);
        setData(response);
        setPeople((current) => [
          ...new Map(
            [...(page === 1 ? [] : current), ...response.people].map(
              (person) => [person.id, person]
            )
          ).values(),
        ]);
        setVisible(page === 1 ? 10 : revealed + 10);
      } catch (failure: unknown) {
        if (request.signal.aborted || isCancelledError(failure)) return;
        if (page === 1) setError(failure);
        else setMoreError(failure);
      } finally {
        if (!request.signal.aborted) {
          busy.current = false;
          setLoading(false);
        }
      }
    },
    [query]
  );

  useEffect(() => {
    if (!restored) load(1);
    return () => {
      controller.current?.abort();
      busy.current = false;
    };
  }, [query, load, restored]);

  useLayoutEffect(() => {
    if (data) save({ data, items: people, visible });
  }, [save, data, people, visible]);

  if (loading && !data && !error)
    return <Loading className="list__container container" />;
  if (error)
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
  const more =
    data &&
    (visible < people.length || data.page < Math.min(data.totalPages, 500));
  const buttonLabel = moreError ? 'Try again' : 'Load more';
  let emptyMessage = query
    ? `No people found for "${query}".`
    : 'No people available.';
  if (data?.totalResults)
    emptyMessage = more
      ? 'No matching persons yet. Load more to continue.'
      : 'No matching persons found.';
  return (
    <section
      className="list__container container"
      aria-label="People results"
      aria-busy={loading}
    >
      <div className="list__summary" aria-live="polite">
        <h2 className="list__number">
          <strong>{data?.totalResults ?? 0}</strong> people found
        </h2>
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
              if (visible < people.length)
                setVisible((current) => current + 10);
              else load(data.page + 1, Math.min(visible, people.length));
            }}
          >
            {loading ? 'Loading more...' : buttonLabel}
          </button>
        </div>
      )}
    </section>
  );
}
