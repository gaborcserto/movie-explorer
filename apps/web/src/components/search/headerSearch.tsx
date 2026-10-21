import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { FaMagnifyingGlass, FaXmark } from 'react-icons/fa6';

import useAutocomplete from './useAutocomplete';
import Suggestions from './suggestions';
import './headerSearch.scss';

export default function HeaderSearch() {
  const [expanded, setExpanded] = useState(false);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const autocomplete = useAutocomplete('', expanded);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
    else if (inputRef.current?.form?.contains(document.activeElement))
      triggerRef.current?.focus();
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
      ref={autocomplete.containerRef}
      className="detail-search"
      onBlur={autocomplete.onBlur}
    >
      <button
        ref={triggerRef}
        type="button"
        className="detail-search__trigger"
        aria-label={
          expanded ? 'Close search' : 'Search movies, series and people'
        }
        aria-expanded={expanded}
        aria-controls={inputId}
        onClick={() => {
          if (expanded) close();
          else setExpanded(true);
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
        aria-label="Movie, Series and Person search"
        aria-hidden={!expanded}
        inert={!expanded}
        onSubmit={(event) => {
          event.preventDefault();
          if (autocomplete.query.trim()) autocomplete.submit();
        }}
      >
        <label className="visually-hidden" htmlFor={inputId}>
          Search movies, series and people
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          placeholder="Search movies, series and people..."
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
