import { useCallback, useLayoutEffect, useRef } from 'react';
import type { SearchResponse, SearchResult } from '@movie-explorer/contracts';

import presentApiError from '../../util/errorPresentation';
import { getSearchResults, getPopularSeries } from '../../util/apiUtils';
import SearchResultCard from './searchResultCard';
import { ResultsSkeleton, CardSkeletons } from '../skeleton';
import Error from '../../layouts/error';
import { useResultHistory, useSearchHistory } from './useSearchHistory';

import usePaginatedResults from './hooks/usePaginatedResults';

const resultItems = (response: SearchResponse) => response.results;

const resultKey = (item: SearchResult) => `${item.mediaType}:${item.id}`;

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
  const fetchPage = useCallback(
    (page: number, signal: AbortSignal) =>
      query
        ? getSearchResults(query, type, page, signal, year)
        : getPopularSeries(page, { year, rating, sorting, order }, signal),
    [query, type, year, rating, sorting, order]
  );
  const { data, items, visible, setVisible, loading, error, moreError, load } =
    usePaginatedResults(restored, fetchPage, resultItems, resultKey);
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

  useLayoutEffect(() => {
    if (data) {
      save({ data, items, visible });
    }
  }, [save, data, items, visible]);

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
  const buttonLabel = moreError ? 'Try again' : 'Load more';
  let emptyMessage = `No results found for "${query}".`;

  if (data?.totalResults) {
    emptyMessage = more
      ? 'No matching series yet. Load more to continue.'
      : 'No matching series found.';
  }

  return (
    <section
      className="list__container container"
      aria-busy={loading}
      aria-label="Series results"
    >
      <div className="list__summary" aria-live="polite">
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
        {loading && <CardSkeletons count={10} />}
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
              if (visible < items.length) {
                setVisible((current) => current + 10);
              } else if (data) {
                load(data.page + 1, Math.min(visible, items.length));
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
