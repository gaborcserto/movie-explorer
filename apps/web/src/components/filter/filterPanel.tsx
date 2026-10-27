import { useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  FaSliders,
  FaFilm,
  FaCalendarDays,
  FaStar,
  FaArrowDownWideShort,
  FaArrowUp,
  FaArrowDown,
  FaArrowRotateLeft,
  FaCheck,
  FaXmark,
  FaChevronDown,
} from 'react-icons/fa6';
import { genresFilter, sortOptions } from '../../data';
import { sortParams } from '../../util/apiUtils';
import { ratingOptions, readFilters, validYear } from './filterState';
import type { FilterValues } from './filterState';
import useFilterPanelDialog from './hooks/useFilterPanelDialog';
import useFilterPanelPosition from './hooks/useFilterPanelPosition';

function getSortLabel(sorting: FilterValues['sorting']) {
  if (sorting === 'releaseDate') return 'Release Date';
  if (sorting === 'popularity') return 'Popularity';
  if (sorting === 'title') return 'Title';

  return 'Rating';
}

function FilterSection({
  title,
  value,
  icon,
  children,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();

  return (
    <section className="filter-section">
      <h3>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(!expanded)}
        >
          {icon}
          <span>
            {title}
            <small>{value}</small>
          </span>
          <FaChevronDown
            className="filter-section__chevron"
            aria-hidden="true"
          />
        </button>
      </h3>
      <div
        id={id}
        className={`filter-section__body${expanded ? ' is-expanded' : ''}`}
        inert={!expanded}
      >
        <div>
          <div className="filter-section__content">{children}</div>
        </div>
      </div>
    </section>
  );
}

export default function FilterPanel({
  committed,
  isSearch,
  series = false,
  onApply,
  onClose,
  closing,
}: {
  committed: FilterValues;
  isSearch: boolean;
  series?: boolean;
  onApply: (values: FilterValues) => void;
  onClose: () => void;
  closing: boolean;
}) {
  const [draft, setDraft] = useState(committed);
  const panel = useRef<HTMLDivElement>(null);
  const mobile = useFilterPanelPosition(panel);
  const titleId = useId();
  const yearId = useId();
  const update = (values: Partial<FilterValues>) =>
    setDraft((current) => ({ ...current, ...values }));
  const invalidYear = Boolean(draft.year && !validYear(draft.year));

  useFilterPanelDialog({ panel, mobile, onClose });

  const content = (
    <div
      ref={panel}
      className={`filter-panel${closing ? ' is-closing' : ''}`}
      role="dialog"
      aria-modal={mobile || undefined}
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      <header className="filter-panel__header">
        <h2 id={titleId}>
          <FaSliders aria-hidden="true" />
          Filters & Sort
        </h2>
        <button type="button" aria-label="Close filters" onClick={onClose}>
          <FaXmark aria-hidden="true" />
        </button>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!invalidYear) onApply(draft);
        }}
      >
        <div className="filter-panel__content">
          {!series && (
            <FilterSection
              title="Genre"
              value={
                draft.filter
                  ? draft.filter[0].toUpperCase() + draft.filter.slice(1)
                  : 'All Genres'
              }
              icon={<FaFilm aria-hidden="true" />}
            >
              <div className="filter-chips" role="group" aria-label="Genre">
                {['', ...genresFilter].map((genre) => (
                  <button
                    type="button"
                    key={genre}
                    aria-pressed={draft.filter === genre}
                    onClick={() =>
                      update({ filter: draft.filter === genre ? '' : genre })
                    }
                  >
                    {genre || 'All genres'}
                  </button>
                ))}
              </div>
            </FilterSection>
          )}
          <FilterSection
            title={series ? 'First-air Year' : 'Release Year'}
            value={draft.year || 'Any Year'}
            icon={<FaCalendarDays aria-hidden="true" />}
          >
            <label htmlFor={yearId}>
              {series ? 'First-air year' : 'Release year'}
            </label>
            <input
              id={yearId}
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="Any Year"
              value={draft.year}
              aria-invalid={invalidYear}
              aria-describedby={`${yearId}-help`}
              onChange={(event) =>
                update({
                  year: event.target.value.replace(/\D/g, '').slice(0, 4),
                })
              }
              onKeyDown={(event) => {
                if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')
                  return;
                event.preventDefault();
                const current = validYear(draft.year)
                  ? Number(draft.year)
                  : new Date().getFullYear();
                update({
                  year: String(
                    Math.min(
                      9999,
                      Math.max(
                        1874,
                        current + (event.key === 'ArrowUp' ? 1 : -1)
                      )
                    )
                  ),
                });
              }}
            />
            <p id={`${yearId}-help`}>
              {invalidYear
                ? 'Enter a year from 1874 to 9999.'
                : 'One year, from 1874 to 9999. Leave empty for Any Year.'}
            </p>
            <button type="button" onClick={() => update({ year: '' })}>
              Any Year
            </button>
          </FilterSection>
          {(!series || !isSearch) && (
            <FilterSection
              title="Minimum Rating"
              value={
                draft.rating ? `${draft.rating}+ TMDB rating` : 'Any Rating'
              }
              icon={<FaStar aria-hidden="true" />}
            >
              <label>
                Minimum TMDB rating
                <select
                  value={draft.rating}
                  onChange={(event) => update({ rating: event.target.value })}
                >
                  <option value="">Any Rating</option>
                  {ratingOptions.map((rating) => (
                    <option key={rating} value={rating}>
                      {rating}+
                    </option>
                  ))}
                </select>
              </label>
            </FilterSection>
          )}
          <FilterSection
            title="Sort By"
            value={isSearch ? 'Relevance' : getSortLabel(draft.sorting)}
            icon={<FaArrowDownWideShort aria-hidden="true" />}
          >
            {isSearch ? (
              <p>Sorted by relevance.</p>
            ) : (
              <label>
                Sort field
                <select
                  value={draft.sorting}
                  onChange={(event) =>
                    update({
                      sorting: sortParams(event.target.value) ?? 'popularity',
                    })
                  }
                >
                  {sortOptions.map((option) => (
                    <option key={option} value={sortParams(option)}>
                      {series && option === 'Release Date'
                        ? 'First-air Date'
                        : option}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </FilterSection>
          {!isSearch && (
            <FilterSection
              title="Sort Direction"
              value={draft.order === 'asc' ? 'Ascending' : 'Descending'}
              icon={
                draft.order === 'asc' ? (
                  <FaArrowUp aria-hidden="true" />
                ) : (
                  <FaArrowDown aria-hidden="true" />
                )
              }
            >
              <div
                className="filter-chips"
                role="group"
                aria-label="Sort direction"
              >
                {(['asc', 'desc'] as const).map((order) => (
                  <button
                    key={order}
                    type="button"
                    aria-pressed={draft.order === order}
                    onClick={() => update({ order })}
                  >
                    {order === 'asc' ? (
                      <FaArrowUp aria-hidden="true" />
                    ) : (
                      <FaArrowDown aria-hidden="true" />
                    )}
                    {order === 'asc' ? 'Ascending' : 'Descending'}
                  </button>
                ))}
              </div>
            </FilterSection>
          )}
        </div>
        <footer className="filter-panel__footer">
          <p>Reset changes the draft. Apply updates results.</p>
          <div>
            <button
              type="button"
              onClick={() =>
                setDraft(readFilters(new URLSearchParams(), isSearch))
              }
            >
              <FaArrowRotateLeft aria-hidden="true" />
              Reset
            </button>
            <button
              className="filter-panel__apply"
              type="submit"
              disabled={invalidYear}
            >
              <FaCheck aria-hidden="true" />
              Apply
            </button>
          </div>
        </footer>
      </form>
    </div>
  );

  return mobile
    ? createPortal(
        <div className={`filter-overlay${closing ? ' is-closing' : ''}`}>
          <button
            type="button"
            tabIndex={-1}
            className="filter-backdrop"
            aria-label="Dismiss filters"
            onClick={onClose}
          />
          {content}
        </div>,
        document.body
      )
    : content;
}
