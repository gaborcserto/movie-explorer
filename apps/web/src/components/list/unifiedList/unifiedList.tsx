import { useTranslation } from 'react-i18next';
import { useCallback, useLayoutEffect, useRef } from 'react';
import type { SearchResponse, SearchResult } from '@movie-explorer/contracts';

import { formatNumber } from '../../../i18n/format';
import { i18n } from '../../../i18n';
import presentApiError from '../../../util/errorPresentation';
import { getSearchResults, getPopularSeries } from '../../../util/apiUtils';
import SearchResultCard from '../searchResultCard';
import { ResultsSkeleton, CardSkeletons } from '../../skeleton';
import Error from '../../../layouts/error';
import { useResultHistory, useSearchHistory } from '../useSearchHistory';
import usePaginatedResults from '../hooks/usePaginatedResults';

const resultItems = (response: SearchResponse, includePosterless: boolean) =>
  includePosterless
    ? response.results
    : response.results.filter(
        (item) =>
          item.mediaType === 'person' ||
          (typeof item.posterUrl === 'string' && item.posterUrl.trim() !== '')
      );

const resultKey = (item: SearchResult) => `${item.mediaType}:${item.id}`;

export default function UnifiedList({
  query,
  type,
  genre,
  year,
  rating,
  sorting,
  order,
}: {
  query: string;
  type: 'tv';
  genre?: string;
  year?: string;
  rating?: string;
  sorting?: string;
  order?: string;
}) {
  useTranslation();

  const history = useSearchHistory();
  const { restored, save } = useResultHistory(
    history?.unified,
    JSON.stringify([query, type, genre, year, rating, sorting, order])
  );

  const fetchPage = useCallback(
    (page: number, signal: AbortSignal) =>
      query
        ? getSearchResults(query, type, page, signal, year)
        : getPopularSeries(
            page,
            { genre, year, rating, sorting, order },
            signal
          ),
    [query, type, genre, year, rating, sorting, order]
  );

  const getItems = useCallback(
    (response: SearchResponse) => resultItems(response, Boolean(query)),
    [query]
  );

  const { data, items, visible, setVisible, loading, error, moreError, load } =
    usePaginatedResults(restored, fetchPage, getItems, resultKey);
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
        actionLabel={i18n.t('ui.try_again')}
        onAction={() => load(1)}
      />
    );
  }

  const buttonLabel = moreError
    ? i18n.t('ui.try_again')
    : i18n.t('ui.load_more');
  let emptyMessage = i18n.t('messages.noResults', { query });

  if (data?.totalResults) {
    emptyMessage = more
      ? i18n.t('ui.no_matching_series_yet_load_more_to_continue')
      : i18n.t('ui.no_matching_series_found');
  }

  return (
    <section
      className="list__container container"
      aria-busy={loading}
      aria-label={i18n.t('ui.series_results')}
    >
      <div className="list__summary" aria-live="polite">
        <p ref={countRef} tabIndex={-1} className="list__loaded">
          {loading ? i18n.t('ui.loading_more_results') : ''}
          {formatNumber(Math.min(visible, items.length))}{' '}
          {i18n.t('ui.results_loaded')}
        </p>
      </div>
      {year && (
        <p className="list__context">
          {i18n.t('ui.first_air_year')} {year}
        </p>
      )}
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
            {loading ? i18n.t('ui.loading_more_label') : buttonLabel}
          </button>
        </div>
      )}
    </section>
  );
}
