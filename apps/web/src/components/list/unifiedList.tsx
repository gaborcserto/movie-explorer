import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { SearchResponse, SearchResult } from '@movie-explorer/contracts';
import presentApiError, {
  isCancelledError,
} from '../../util/errorPresentation';
import { getSearchResults } from '../../util/apiUtils';
import Card from '../card/card';
import Loading from '../../layouts/loading';
import Error from '../../layouts/error';
import { useResultHistory, useSearchHistory } from './useSearchHistory';

const typeLabels = { movie: 'Movie', tv: 'Series', person: 'Person' };

export default function UnifiedList({
  query,
  type,
  year,
}: {
  query: string;
  type: 'all' | 'tv';
  year?: string;
}) {
  const history = useSearchHistory();
  const { restored, save } = useResultHistory(
    history?.unified,
    JSON.stringify([query, type, year])
  );
  const [data, setData] = useState<SearchResponse | undefined>(restored?.data);
  const [items, setItems] = useState<SearchResult[]>(restored?.items ?? []);
  const [visible, setVisible] = useState(restored?.visible ?? 10);
  const [loading, setLoading] = useState(Boolean(query) && !restored);
  const [error, setError] = useState<unknown>(null);
  const [moreError, setMoreError] = useState<unknown>(null);
  const controller = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const countRef = useRef<HTMLParagraphElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const restoreCountFocus = useRef(false);
  const more = Boolean(
    data &&
    (visible < items.length || data.page < Math.min(data.totalPages, 500))
  );

  useLayoutEffect(() => {
    if (restoreCountFocus.current && !more && !loading) {
      countRef.current?.focus();
      restoreCountFocus.current = false;
    }
  }, [more, loading]);

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
        const response = await getSearchResults(
          query,
          type,
          page,
          request.signal,
          year
        );
        if (request.signal.aborted) return;
        setError(null);
        setData(response);
        setItems((current) => [
          ...new Map(
            [...(page === 1 ? [] : current), ...response.results].map(
              (item) => [`${item.mediaType}:${item.id}`, item]
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
    [query, type, year]
  );

  useEffect(() => {
    if (query && !restored) load(1);
    return () => {
      controller.current?.abort();
      busy.current = false;
    };
  }, [query, load, restored]);

  useLayoutEffect(() => {
    if (data) save({ data, items, visible });
  }, [save, data, items, visible]);

  if (!query)
    return (
      <p className="list__container container" role="status">
        Enter a title or name to search Movies, Series and Persons.
      </p>
    );
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
  const buttonLabel = moreError ? 'Try again' : 'Load more';
  let emptyMessage = `No results found for "${query}".`;
  if (data?.totalResults)
    emptyMessage = more
      ? 'No results in the pages checked so far. Load more to check the next page.'
      : 'No results in the accessible result pages.';
  return (
    <section
      className="list__container container"
      aria-busy={loading}
      aria-label={type === 'tv' ? 'Series results' : 'All results'}
    >
      <div className="list__summary" aria-live="polite">
        <h2 className="list__number">
          <strong>{data?.totalResults ?? 0}</strong> reported matches
        </h2>
        <p ref={countRef} tabIndex={-1} className="list__loaded">
          {loading ? 'Loading more results... ' : ''}
          {Math.min(visible, items.length)} results loaded
        </p>
      </div>
      <p className="list__context">
        Results use search relevance. Reported totals may include entries that
        cannot be displayed. Up to 500 pages are accessible.
      </p>
      {!loading && items.length === 0 && <p role="status">{emptyMessage}</p>}
      <div className="list__items">
        {items.slice(0, visible).map((item) => {
          const person = item.mediaType === 'person';
          const label = typeLabels[item.mediaType];
          let date: string | undefined;
          let metadata: string | undefined;
          if (item.mediaType === 'person') {
            metadata = item.knownForDepartment;
          } else {
            date =
              item.mediaType === 'tv' ? item.firstAirDate : item.releaseDate;
            if (item.rating !== undefined)
              metadata = `${item.rating.toFixed(1)} / 10`;
          }

          return (
            <Card
              key={`${item.mediaType}:${item.id}`}
              movie={{
                id: item.id,
                title: person ? item.name : item.title,
                posterUrl: person
                  ? (item.profileUrl ?? '')
                  : (item.posterUrl ?? ''),
                genres: [],
              }}
              destination={`/${item.mediaType}/${item.id}`}
              displayDate={date}
              subtitle={[label, metadata].filter(Boolean).join(' / ')}
              genreNavigation={false}
            />
          );
        })}
      </div>
      {Boolean(moreError) && (
        <p role="alert">{presentApiError(moreError)?.description}</p>
      )}
      {more && (
        <div className="list__more">
          <button
            ref={moreRef}
            type="button"
            className="btn btn--primary"
            disabled={loading}
            onClick={() => {
              restoreCountFocus.current =
                document.activeElement === moreRef.current;
              if (visible < items.length) setVisible((current) => current + 10);
              else if (data)
                load(data.page + 1, Math.min(visible, items.length));
            }}
          >
            {loading ? 'Loading more...' : buttonLabel}
          </button>
        </div>
      )}
    </section>
  );
}
