import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
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
  onApply,
  onClose,
  closing,
}: {
  committed: FilterValues;
  isSearch: boolean;
  onApply: (values: FilterValues) => void;
  onClose: () => void;
  closing: boolean;
}) {
  const [draft, setDraft] = useState(committed);
  const panel = useRef<HTMLDivElement>(null);
  const [mobile, setMobile] = useState(
    () => window.matchMedia?.('(max-width: 767px)').matches ?? false
  );
  const titleId = useId();
  const yearId = useId();
  const update = (values: Partial<FilterValues>) =>
    setDraft((current) => ({ ...current, ...values }));
  const invalidYear = Boolean(draft.year && !validYear(draft.year));

  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 767px)');
    const change = () => setMobile(media?.matches ?? false);

    media?.addEventListener('change', change);

    return () => media?.removeEventListener('change', change);
  }, []);

  useLayoutEffect(() => {
    const element = panel.current;
    const position = () => {
      if (!element) return;

      const viewport = window.visualViewport;
      if (mobile) {
        element.style.setProperty(
          '--filter-viewport-height',
          `${viewport?.height ?? window.innerHeight}px`
        );
        element.style.setProperty(
          '--filter-viewport-bottom',
          `${Math.max(0, window.innerHeight - (viewport?.height ?? window.innerHeight) - (viewport?.offsetTop ?? 0))}px`
        );
        return;
      }

      const anchor = element.parentElement?.getBoundingClientRect();
      if (!anchor) return;

      const below = window.innerHeight - anchor.bottom - 26;
      const above = anchor.top - 26;
      const flip = below < 300 && above > below;
      const available = Math.max(0, flip ? above : below);
      element.style.top = flip
        ? 'auto'
        : `${Math.max(16, anchor.bottom + 10)}px`;
      element.style.bottom = flip
        ? `${window.innerHeight - anchor.top + 10}px`
        : 'auto';
      element.style.left = `${Math.max(16, Math.min(anchor.right - element.offsetWidth, window.innerWidth - element.offsetWidth - 16))}px`;
      element.style.setProperty('--filter-available-height', `${available}px`);
    };

    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);

    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
    };
  }, [mobile]);

  useEffect(() => {
    const element = panel.current;
    if (!element) return undefined;

    const previousFocus = document.activeElement;
    element.focus();
    const previousOverflow = document.body.style.overflow;
    const background = mobile
      ? Array.from(document.querySelectorAll<HTMLElement>('body > *')).filter(
          (node) => !node.contains(element)
        )
      : [];
    const previousInert = background.map((node) => node.inert);
    if (mobile) document.body.style.overflow = 'hidden';
    background.forEach((node) => {
      node.inert = true;
    });

    const focusables = () =>
      Array.from(
        element.querySelectorAll<HTMLElement>(
          'button, input, select, [tabindex="0"]'
        )
      ).filter(
        (node) => !node.closest('[inert]') && !node.hasAttribute('disabled')
      );

    const containFocus = (event: FocusEvent) => {
      if (
        mobile &&
        event.target instanceof Node &&
        !element.contains(event.target)
      )
        element.focus();
    };

    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (mobile && event.key === 'Tab') {
        const items = focusables();
        const first = items[0];
        const last = items.at(-1);
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === element)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === element)
        ) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', keydown);
    document.addEventListener('focusin', containFocus);

    return () => {
      document.body.style.overflow = previousOverflow;
      background.forEach((node, index) => {
        node.inert = previousInert[index];
      });
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('focusin', containFocus);
      if (
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected &&
        !previousFocus.closest('[hidden]') &&
        (element.contains(document.activeElement) ||
          document.activeElement === document.body)
      )
        previousFocus.focus();
    };
  }, [mobile, onClose]);

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
          <FilterSection
            title="Release Year"
            value={draft.year || 'Any Year'}
            icon={<FaCalendarDays aria-hidden="true" />}
          >
            <label htmlFor={yearId}>Release year</label>
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
          <FilterSection
            title="Minimum Rating"
            value={draft.rating ? `${draft.rating}+ TMDB rating` : 'Any Rating'}
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
          <FilterSection
            title="Sort By"
            value={isSearch ? 'Relevance' : getSortLabel(draft.sorting)}
            icon={<FaArrowDownWideShort aria-hidden="true" />}
          >
            {isSearch ? (
              <p>
                Text searches use TMDB relevance ordering. Custom sorting is
                unavailable.
              </p>
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
                      {option}
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
