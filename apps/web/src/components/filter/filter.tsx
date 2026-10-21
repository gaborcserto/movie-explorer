import './filter.scss';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { FaSliders } from 'react-icons/fa6';

import { normalizeFilters, readFilters, writeFilters } from './filterState';
import FilterPanel from './filterPanel';

export default function Filter() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const { searchQuery } = useParams();

  const isSearch = Boolean(searchQuery);
  const series = params.get('view') === 'tv';

  const [openAt, setOpenAt] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const wrapper = useRef<HTMLDivElement>(null);

  const committed = readFilters(params, isSearch);
  const open = openAt === location.key;
  const count = series
    ? Number(Boolean(committed.year))
    : Number(Boolean(committed.filter)) +
      Number(Boolean(committed.year)) +
      Number(Boolean(committed.rating)) +
      Number(!isSearch && committed.sorting !== 'popularity') +
      Number(
        !isSearch &&
          committed.order !== (committed.sorting === 'title' ? 'asc' : 'desc')
      );

  const closePanel = useCallback(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
      setOpenAt(null);
    else setClosing(true);
  }, []);

  useEffect(() => {
    if (!closing) return undefined;

    const timeout = window.setTimeout(() => {
      setOpenAt(null);
      setClosing(false);
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [closing]);

  useEffect(() => {
    const normalized = normalizeFilters(params, isSearch);

    if (normalized.toString() !== params.toString())
      setParams(normalized, { replace: true });
  }, [params, isSearch, setParams]);

  useEffect(() => {
    if (!open) return undefined;

    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !wrapper.current?.contains(event.target) &&
        !(
          event.target instanceof Element &&
          event.target.closest('.filter-overlay')
        )
      )
        closePanel();
    };

    document.addEventListener('pointerdown', outside);

    return () => document.removeEventListener('pointerdown', outside);
  }, [open, closePanel]);

  useEffect(() => {
    if (openAt !== null && openAt !== location.key) {
      setOpenAt(null);
      setClosing(false);
    }
  }, [location.key, openAt]);

  return (
    <section
      className="movie-filters"
      aria-label={
        series ? 'Series filters and sorting' : 'Movie filters and sorting'
      }
    >
      <div ref={wrapper} className="movie-filters__anchor">
        <button
          type="button"
          className="movie-filters__trigger"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => {
            if (open) closePanel();
            else {
              setClosing(false);
              setOpenAt(location.key);
            }
          }}
        >
          <FaSliders aria-hidden="true" />
          Filters & Sort
          {count > 0 && (
            <span
              className="movie-filters__count"
              aria-label={`${count} active filters`}
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
                series ? { ...committed, year: values.year } : values,
                isSearch
              );

              closePanel();
              if (next.toString() !== params.toString()) setParams(next);
            }}
          />
        )}
      </div>
    </section>
  );
}
