import { useTranslation } from 'react-i18next';
import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { FaMagnifyingGlass, FaXmark } from 'react-icons/fa6';

import { i18n } from '../../../i18n';
import useAutocomplete from '../useAutocomplete';
import Suggestions from '../suggestions';
import './headerSearch.scss';

export default function HeaderSearch() {
  useTranslation();

  const [expanded, setExpanded] = useState(false);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { containerRef, ...autocomplete } = useAutocomplete('', expanded);

  useEffect(() => {
    if (expanded) {
      inputRef.current?.focus();
    } else if (inputRef.current?.form?.contains(document.activeElement)) {
      triggerRef.current?.focus();
    }
  }, [expanded]);

  const close = () => {
    autocomplete.dismiss();
    triggerRef.current?.focus();
    setExpanded(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && !autocomplete.open) {
      event.preventDefault();
      close();
    }
  };

  return (
    <div
      ref={containerRef}
      className="detail-search"
      onBlur={autocomplete.onBlur}
    >
      <button
        ref={triggerRef}
        type="button"
        className="detail-search__trigger"
        aria-label={
          expanded
            ? i18n.t('ui.close_search')
            : i18n.t('ui.search_movies_series_and_people')
        }
        aria-expanded={expanded}
        aria-controls={inputId}
        onClick={() => {
          if (expanded) {
            close();
          } else {
            setExpanded(true);
          }
        }}
      >
        <FaMagnifyingGlass
          className={`detail-search__icon detail-search__icon--search${expanded ? ' detail-search__icon--hidden' : ''}`}
          aria-hidden="true"
        />
        <FaXmark
          className={`detail-search__icon detail-search__icon--close${expanded ? '' : ' detail-search__icon--hidden'}`}
          aria-hidden="true"
        />
      </button>
      <form
        className={`detail-search__form${expanded ? ' detail-search__form--expanded' : ''}`}
        role="search"
        aria-label={i18n.t('ui.movie_series_and_person_search')}
        aria-hidden={!expanded}
        inert={!expanded}
        onSubmit={(event) => {
          event.preventDefault();
          if (autocomplete.query.trim()) {
            autocomplete.submit();
          }
        }}
      >
        <label className="visually-hidden" htmlFor={inputId}>
          {i18n.t('ui.search_movies_series_and_people')}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          placeholder={i18n.t('ui.search_movies_series_and_people_label')}
          autoComplete="off"
          value={autocomplete.query}
          onChange={(event) => autocomplete.edit(event.target.value)}
          {...autocomplete.inputProps}
          onKeyDown={(event) => {
            handleKeyDown(event);
            autocomplete.onKeyDown(event);
          }}
        />
      </form>
      {expanded && <Suggestions autocomplete={autocomplete} />}
    </div>
  );
}
