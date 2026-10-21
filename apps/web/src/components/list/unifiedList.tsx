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
import { getSearchResults, getPopularSeries } from '../../util/apiUtils';
import SearchResultCard from './searchResultCard';
import Loading from '../../layouts/loading';
import Error from '../../layouts/error';
import { useResultHistory, useSearchHistory } from './useSearchHistory';

export default function UnifiedList({
  query,
  type,
  year,
  rating,
  sorting,
  order,
}: {
  query: string;
  type: 'tv';
  year?: string;
  rating?: string;
  sorting?: string;
  order?: string;
}) {
  const history = useSearchHistory();
  const { restored, save } = useResultHistory(
    history?.unified,
    JSON.stringify([query, type, year, rating, sorting, order])
  );
  const [data, setData] = useState<SearchResponse | undefined>(restored?.data);
  const [items, setItems] = useState<SearchResult[]>(restored?.items ?? []);
  const [visible, setVisible] = useState(restored?.visible ?? 10);
  const [loading, setLoading] = useState(!restored);
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
        const response = query
          ? await getSearchResults(query, type, page, request.signal, year)
          : await getPopularSeries(
              page,
              { year, rating, sorting, order },
              request.signal
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
    [query, type, year, rating, sorting, order]
  );

  useEffect(() => {
    if (!restored) load(1);
    return () => {
      controller.current?.abort();
      busy.current = false;
    };
  }, [query, load, restored]);

  useLayoutEffect(() => {
    if (data) save({ data, items, visible });
  }, [save, data, items, visible]);

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
      ? 'No matching series yet. Load more to continue.'
      : 'No matching series found.';
  return (
    <section
      className="list__container container"
      aria-busy={loading}
      aria-label="Series results"
    >
      <div className="list__summary" aria-live="polite">
        <h2 className="list__number">
          <strong>{data?.totalResults ?? 0}</strong> series found
        </h2>
        <p ref={countRef} tabIndex={-1} className="list__loaded">
          {loading ? 'Loading more results... ' : ''}
          {Math.min(visible, items.length)} results loaded
        </p>
      </div>
      {year && <p className="list__context">First-air year: {year}</p>}
      {!loading && items.length === 0 && <p role="status">{emptyMessage}</p>}
      <div className="list__items">
        {items.slice(0, visible).map((item) => {
          return (
            <SearchResultCard
              key={`${item.mediaType}:${item.id}`}
              item={item}
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
            className="btn btn--outline btn--action"
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
