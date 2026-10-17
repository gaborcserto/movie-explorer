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
  const [loading, setLoading] = useState(Boolean(query) && !restored);
  const [error, setError] = useState(false);
  const [moreError, setMoreError] = useState(false);
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
      setError(false);
      setMoreError(false);
      try {
        const response = await getPeople(query, page, request.signal);
        if (request.signal.aborted) return;
        setData(response);
        setPeople((current) => [
          ...new Map(
            [...(page === 1 ? [] : current), ...response.people].map(
              (person) => [person.id, person]
            )
          ).values(),
        ]);
        setVisible(page === 1 ? 10 : revealed + 10);
      } catch {
        if (request.signal.aborted) return;
        if (page === 1) setError(true);
        else setMoreError(true);
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
    if (query && !restored) load(1);
    return () => {
      controller.current?.abort();
      busy.current = false;
    };
  }, [query, load, restored]);

  useLayoutEffect(() => {
    if (data) save({ data, items: people, visible });
  }, [save, data, people, visible]);

  if (!query)
    return (
      <p className="list__container container" role="status">
        Enter a name to search for people.
      </p>
    );
  if (loading && !data)
    return <Loading className="list__container container" />;
  if (error)
    return (
      <Error
        className="list__container container"
        title="Unable to load people"
        message="Something went wrong while loading people."
        actionLabel="Try again"
        onAction={() => load(1)}
      />
    );
  const more =
    data &&
    (visible < people.length || data.page < Math.min(data.totalPages, 500));
  const buttonLabel = moreError ? 'Try again' : 'Load more';
  let emptyMessage = `No people found for "${query}".`;
  if (data?.totalResults)
    emptyMessage = more
      ? 'No people in the pages checked so far. Load more to check the next page.'
      : 'No people in the accessible result pages.';
  return (
    <section className="list__container container" aria-label="People results">
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
      {moreError && <p role="alert">Unable to load more people.</p>}
      {more && (
        <div className="list__more">
          <button
            type="button"
            className="btn btn--primary"
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
