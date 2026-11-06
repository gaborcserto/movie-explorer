import { useTranslation } from 'react-i18next';
import { useEffect, useId, useRef, useState } from 'react';
import { FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa';
import {
  FaCalendarDays,
  FaStar,
  FaArrowDownWideShort,
  FaArrowRotateLeft,
  FaCheck,
  FaXmark,
} from 'react-icons/fa6';

import { genreLabel, sortLabel } from '../../../i18n/labels';
import { i18n } from '../../../i18n';
import { genresFilter, sortOptions } from '../../../data';
import { sortParams } from '../../../util/apiUtils';
import { readFilters, validYear, seriesGenres } from '../filterState';
import type { FilterValues } from '../filterState';
import Drawer from '../../drawer';

function getSortOptionLabel(option: string) {
  if (option !== 'Release Date') {
    return sortLabel(option);
  }

  return i18n.t('ui.date');
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
  useTranslation();

  const [draft, setDraft] = useState(committed);
  const yearId = useId();
  const yearListId = useId();
  const ratingId = useId();
  const formId = useId();
  const yearInput = useRef<HTMLInputElement>(null);
  const yearTrigger = useRef<HTMLButtonElement>(null);
  const yearPicker = useRef<HTMLDivElement>(null);
  const yearList = useRef<HTMLDivElement>(null);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [yearPickerReady, setYearPickerReady] = useState(false);
  const [yearPickerPlacement, setYearPickerPlacement] = useState<
    'bottom' | 'top'
  >('bottom');
  const [yearPickerMaxHeight, setYearPickerMaxHeight] = useState<number>();
  const [earlierYearPage, setEarlierYearPage] = useState(0);

  const currentYear = new Date().getFullYear();

  const update = (values: Partial<FilterValues>) =>
    setDraft((current) => ({ ...current, ...values }));

  const selectedGenres: string[] = series ? draft.seriesGenre : draft.filter;
  const availableGenres: readonly string[] = series
    ? seriesGenres
    : genresFilter;

  const handleRemoveGenre = (genre: string) => {
    update(
      series
        ? { seriesGenre: draft.seriesGenre.filter((item) => item !== genre) }
        : { filter: draft.filter.filter((item) => item !== genre) }
    );
  };

  const handleSelectGenre = (genre: string) => {
    if (series) {
      const seriesGenre = seriesGenres.find((item) => item === genre);

      if (seriesGenre && !draft.seriesGenre.includes(seriesGenre)) {
        update({ seriesGenre: [...draft.seriesGenre, seriesGenre] });
      }
    } else if (!draft.filter.includes(genre)) {
      update({ filter: [...draft.filter, genre] });
    }
  };

  const invalidYear = Boolean(draft.year && !validYear(draft.year));
  const ratingNumber = Number(draft.rating);
  const validRating =
    !draft.rating ||
    (Number.isFinite(ratingNumber) &&
      ratingNumber >= 0.5 &&
      ratingNumber <= 10 &&
      ratingNumber * 2 === Math.round(ratingNumber * 2));
  const invalidRating = Boolean(draft.rating && !validRating);

  const years = Array.from({ length: 12 }, (_, index) =>
    String(currentYear - earlierYearPage * 12 - index)
  ).filter((year) => Number(year) >= 1874);
  const invalidFilters = invalidYear || invalidRating;

  useEffect(() => {
    if (!yearPickerOpen) {
      return undefined;
    }

    const updatePlacement = () => {
      const trigger = yearTrigger.current;
      const list = yearList.current;
      const picker = yearPicker.current;

      if (!trigger || !list || !picker) {
        return;
      }

      const bounds = trigger.getBoundingClientRect();
      const contentBounds = picker
        .closest<HTMLElement>('.drawer__content')
        ?.getBoundingClientRect();
      const preferredHeight = Math.min(window.innerHeight * 0.4, 320);
      const dropdownHeight = Math.min(list.scrollHeight, preferredHeight);
      const drawerSpaceAbove = contentBounds?.height
        ? bounds.top - contentBounds.top - 8
        : Number.POSITIVE_INFINITY;
      const drawerSpaceBelow = contentBounds?.height
        ? contentBounds.bottom - bounds.bottom - 8
        : Number.POSITIVE_INFINITY;
      const spaceAbove = Math.max(
        0,
        Math.min(bounds.top - 8, drawerSpaceAbove)
      );
      const spaceBelow = Math.max(
        0,
        Math.min(window.innerHeight - bounds.bottom - 8, drawerSpaceBelow)
      );
      const placement =
        spaceBelow < dropdownHeight && spaceAbove >= dropdownHeight
          ? 'top'
          : 'bottom';
      const availableSpace = placement === 'top' ? spaceAbove : spaceBelow;

      setYearPickerPlacement(placement);
      setYearPickerMaxHeight(
        Math.max(0, Math.min(preferredHeight, availableSpace))
      );
      setYearPickerReady(true);
    };

    const closeOnOutsidePointer = (event: globalThis.PointerEvent) => {
      if (
        event.target instanceof Node &&
        !yearPicker.current?.contains(event.target)
      ) {
        setYearPickerOpen(false);
      }
    };

    const closeOnOutsideFocus = (event: FocusEvent) => {
      if (
        event.target instanceof Node &&
        !yearPicker.current?.contains(event.target)
      ) {
        setYearPickerOpen(false);
      }
    };

    const closeOnKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setYearPickerOpen(false);
        yearTrigger.current?.focus();
      }
    };

    yearPicker.current?.scrollIntoView?.({ block: 'nearest' });
    updatePlacement();
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('focusin', closeOnOutsideFocus);
    document.addEventListener('keydown', closeOnKeyboard);
    document.addEventListener('scroll', updatePlacement, true);
    window.addEventListener('resize', updatePlacement);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('focusin', closeOnOutsideFocus);
      document.removeEventListener('keydown', closeOnKeyboard);
      document.removeEventListener('scroll', updatePlacement, true);
      window.removeEventListener('resize', updatePlacement);
    };
  }, [yearPickerOpen]);

  const toggleYearPicker = () => {
    setYearPickerReady(false);
    setYearPickerOpen((open) => !open);
  };

  const footer = (
    <div className="filter-panel__footer">
      <p>{i18n.t('ui.reset_changes_the_draft_apply_updates_results')}</p>
      <div>
        <button
          type="button"
          onClick={() => setDraft(readFilters(new URLSearchParams(), isSearch))}
        >
          <FaArrowRotateLeft aria-hidden="true" />
          {i18n.t('ui.reset')}
        </button>
        <button
          className="filter-panel__apply"
          type="submit"
          form={formId}
          disabled={invalidFilters}
        >
          <FaCheck aria-hidden="true" />
          {i18n.t('ui.apply')}
        </button>
      </div>
    </div>
  );

  return (
    <Drawer
      open={!closing}
      title={i18n.t('ui.filters_sort')}
      onClose={onClose}
      footer={footer}
    >
      <div className="filter-panel">
        <form
          id={formId}
          onSubmit={(event) => {
            event.preventDefault();
            if (!invalidFilters) {
              onApply(draft);
            }
          }}
        >
          {(!series || !isSearch) && (
            <section className="filter-section">
              <h3>{i18n.t('ui.genre')}</h3>
              <div className="filter-genres" aria-label={i18n.t('ui.genres')}>
                <div
                  className={`filter-genres__selected${selectedGenres.length ? '' : ' is-empty'}`}
                  role="group"
                  aria-label={i18n.t('ui.selected_genres')}
                >
                  {selectedGenres.map((genre) => (
                    <span
                      className="filter-genre-chip is-selected"
                      key={genreLabel(genre)}
                    >
                      {genreLabel(genre)}
                      <button
                        type="button"
                        aria-label={i18n.t('messages.removeGenre', {
                          genre: genreLabel(genre),
                        })}
                        onClick={() => handleRemoveGenre(genre)}
                      >
                        <FaXmark aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
                <div
                  className="filter-genres__available"
                  role="group"
                  aria-label={i18n.t('ui.available_genres')}
                >
                  {availableGenres
                    .filter((genre) => !selectedGenres.includes(genre))
                    .map((genre) => (
                      <button
                        type="button"
                        key={genreLabel(genre)}
                        className="filter-genre-link"
                        aria-label={i18n.t('messages.selectGenre', {
                          genre: genreLabel(genre),
                        })}
                        onClick={() => handleSelectGenre(genre)}
                      >
                        {genreLabel(genre)}
                      </button>
                    ))}
                </div>
              </div>
            </section>
          )}
          <section className="filter-section">
            <h3>
              <FaCalendarDays aria-hidden="true" />
              {series ? i18n.t('ui.date') : i18n.t('ui.release_year')}
            </h3>
            {series && <label htmlFor={yearId}>{i18n.t('ui.year')}</label>}
            <div
              ref={yearPicker}
              className={`filter-year-picker${series ? '' : ' filter-year-picker--compact'}`}
            >
              <input
                ref={yearInput}
                id={yearId}
                type="text"
                inputMode="numeric"
                maxLength={4}
                aria-label={
                  series ? i18n.t('ui.year') : i18n.t('ui.release_year')
                }
                placeholder={i18n.t('ui.any_year')}
                value={draft.year}
                aria-invalid={invalidYear}
                aria-describedby={
                  invalidYear || series ? `${yearId}-help` : undefined
                }
                onChange={(event) =>
                  update({
                    year: event.target.value.replace(/\D/g, '').slice(0, 4),
                  })
                }
                onKeyDown={(event) => {
                  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
                    return;
                  }

                  event.preventDefault();

                  const current = validYear(draft.year)
                    ? Number(draft.year)
                    : currentYear;
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
              <button
                ref={yearTrigger}
                type="button"
                className="filter-year-picker__trigger"
                aria-label={i18n.t('ui.choose_a_year')}
                aria-expanded={yearPickerOpen}
                aria-controls={yearListId}
                onClick={toggleYearPicker}
              >
                <FaCalendarDays aria-hidden="true" />
              </button>
              <div
                ref={yearList}
                id={yearListId}
                className="filter-year-picker__list"
                role="group"
                aria-label={i18n.t('ui.choose_a_year')}
                aria-hidden={!yearPickerOpen}
                inert={!yearPickerOpen}
                data-open={yearPickerOpen && yearPickerReady}
                data-placement={yearPickerPlacement}
                style={{ maxHeight: yearPickerMaxHeight }}
              >
                <div className="filter-year-picker__years">
                  {years.map((year) => (
                    <button
                      type="button"
                      key={year}
                      aria-pressed={draft.year === year}
                      onClick={() => {
                        update({ year });
                        setYearPickerOpen(false);
                        yearInput.current?.focus();
                      }}
                    >
                      {year}
                    </button>
                  ))}
                </div>
                {Number(years[years.length - 1]) > 1874 && (
                  <button
                    type="button"
                    className="filter-year-picker__earlier"
                    onClick={() => setEarlierYearPage((page) => page + 1)}
                  >
                    {i18n.t('ui.earlier_years')}
                  </button>
                )}
              </div>
            </div>
            {(invalidYear || series) && (
              <p id={`${yearId}-help`}>
                {invalidYear
                  ? i18n.t('ui.enter_a_year_from_1874_to_9999')
                  : i18n.t('ui.leave_empty_for_any_year')}
              </p>
            )}
          </section>
          {(!series || !isSearch) && (
            <section className="filter-section">
              <div className="filter-rating__heading">
                <h3>
                  <FaStar aria-hidden="true" />
                  {i18n.t('ui.minimum_rating')}
                </h3>
                <input
                  id={`${ratingId}-value`}
                  type="text"
                  inputMode="decimal"
                  className="filter-rating__input"
                  value={draft.rating}
                  placeholder={i18n.t('ui.any')}
                  aria-label={i18n.t('ui.minimum_tmdb_rating')}
                  aria-invalid={invalidRating}
                  aria-describedby={
                    invalidRating ? `${ratingId}-error` : undefined
                  }
                  onChange={(event) =>
                    update({ rating: event.target.value.replace(',', '.') })
                  }
                  onKeyDown={(event) => {
                    if (
                      (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') ||
                      invalidRating
                    ) {
                      return;
                    }

                    event.preventDefault();

                    const currentRating = draft.rating
                      ? Number(draft.rating)
                      : 0;
                    const step = event.key === 'ArrowUp' ? 0.5 : -0.5;
                    const nextRating = Math.min(
                      10,
                      Math.max(0, currentRating + step)
                    );

                    update({
                      rating: nextRating === 0 ? '' : String(nextRating),
                    });
                  }}
                />
              </div>
              <input
                id={ratingId}
                className="filter-rating__slider"
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={validRating ? draft.rating || '0' : '0'}
                aria-label={i18n.t('ui.minimum_tmdb_rating_slider')}
                aria-valuetext={
                  draft.rating && validRating
                    ? i18n.t('messages.minimumRating', { rating: draft.rating })
                    : i18n.t('ui.any_rating')
                }
                onChange={(event) =>
                  update({
                    rating:
                      event.target.value === '0' ? '' : event.target.value,
                  })
                }
              />
              <div className="filter-rating__scale" aria-hidden="true">
                <span>{i18n.t('ui.any')}</span>
                <span>10</span>
              </div>
              {invalidRating && (
                <p
                  id={`${ratingId}-error`}
                  className="filter-rating__error"
                  role="alert"
                >
                  {i18n.t(
                    'ui.enter_a_rating_from_0_5_to_10_in_0_5_increments_or_clear_the_field'
                  )}
                </p>
              )}
            </section>
          )}
          <section className="filter-section">
            <h3>
              <FaArrowDownWideShort aria-hidden="true" />
              {i18n.t('ui.sort_by')}
            </h3>
            {isSearch ? (
              <p>{i18n.t('ui.sorted_by_relevance')}</p>
            ) : (
              <div
                className="filter-sort-options"
                role="group"
                aria-label={i18n.t('ui.sort_by_label')}
              >
                {sortOptions.map((option) => {
                  const sorting = sortParams(option) ?? 'popularity';

                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={draft.sorting === sorting}
                      onClick={() => update({ sorting })}
                    >
                      {getSortOptionLabel(option)}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
          {!isSearch && (
            <section className="filter-section">
              <div className="filter-sort-heading">
                <h3>{i18n.t('ui.sort_direction')}</h3>
                <div
                  className="filter-sort-direction"
                  role="group"
                  aria-label={i18n.t('ui.sort_direction_label')}
                >
                  {(['asc', 'desc'] as const).map((order) => (
                    <button
                      key={order}
                      type="button"
                      aria-pressed={draft.order === order}
                      aria-label={
                        order === 'asc'
                          ? i18n.t('ui.ascending')
                          : i18n.t('ui.descending')
                      }
                      onClick={() => update({ order })}
                    >
                      {order === 'asc' ? (
                        <FaSortAmountUp aria-hidden="true" />
                      ) : (
                        <FaSortAmountDown aria-hidden="true" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}
        </form>
      </div>
    </Drawer>
  );
}
