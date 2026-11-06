import { useTranslation } from 'react-i18next';

import './filter.scss';

import { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router';
import { FaSliders } from 'react-icons/fa6';

import { i18n } from '../../i18n';
import { normalizeFilters, readFilters, writeFilters } from './filterState';
import FilterPanel from './filterPanel';

export default function Filter() {
  useTranslation();

  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const { searchQuery } = useParams();

  const isSearch = Boolean(searchQuery);
  const series = params.get('view') === 'tv';

  const [openAt, setOpenAt] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const committed = readFilters(params, isSearch);
  const open = openAt === location.key;
  const count =
    series && isSearch
      ? Number(Boolean(committed.year))
      : (!series ? committed.filter.length : committed.seriesGenre.length) +
        Number(Boolean(committed.year)) +
        Number(Boolean(committed.rating)) +
        Number(!isSearch && committed.sorting !== 'popularity') +
        Number(
          !isSearch &&
            committed.order !== (committed.sorting === 'title' ? 'asc' : 'desc')
        );

  const closePanel = useCallback(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setOpenAt(null);
    } else {
      setClosing(true);
    }
  }, []);

  useEffect(() => {
    if (!closing) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setOpenAt(null);
      setClosing(false);
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [closing]);

  useEffect(() => {
    const normalized = normalizeFilters(params, isSearch);

    if (normalized.toString() !== params.toString()) {
      setParams(normalized, { replace: true });
    }
  }, [params, isSearch, setParams]);

  if (openAt !== null && openAt !== location.key) {
    setOpenAt(null);
    setClosing(false);
  }

  return (
    <section
      className="movie-filters"
      aria-label={
        series
          ? i18n.t('ui.series_filters_and_sorting')
          : i18n.t('ui.movie_filters_and_sorting')
      }
    >
      <div className="movie-filters__anchor">
        <button
          type="button"
          className="movie-filters__trigger"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => {
            if (open) {
              closePanel();
            } else {
              setClosing(false);
              setOpenAt(location.key);
            }
          }}
        >
          <FaSliders aria-hidden="true" />
          {i18n.t('ui.filters_sort')}
          {count > 0 && (
            <span
              className="movie-filters__count"
              aria-label={i18n.t('messages.activeFilters', { count })}
            >
              {count}
            </span>
          )}
        </button>
        {open && (
          <FilterPanel
            closing={closing}
            committed={committed}
            isSearch={isSearch}
            series={series}
            onClose={closePanel}
            onApply={(values) => {
              const next = writeFilters(
                params,
                series
                  ? {
                      ...values,
                      filter: committed.filter,
                      ...(isSearch && { rating: committed.rating }),
                    }
                  : values,
                isSearch
              );

              closePanel();
              if (next.toString() !== params.toString()) {
                setParams(next);
              }
            }}
          />
        )}
      </div>
    </section>
  );
}
