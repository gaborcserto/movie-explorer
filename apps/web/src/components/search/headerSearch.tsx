import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMagnifyingGlass, FaXmark } from 'react-icons/fa6';
import './headerSearch.scss';

export default function HeaderSearch() {
  const [expanded, setExpanded] = useState(false);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
    else if (inputRef.current?.form?.contains(document.activeElement))
      triggerRef.current?.focus();
  }, [expanded]);

  const close = () => {
    setExpanded(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };

  return (
    <div className="detail-search">
      <button
        ref={triggerRef}
        type="button"
        className="detail-search__trigger"
        aria-label={expanded ? 'Close search' : 'Search movies'}
        aria-expanded={expanded}
        aria-controls={inputId}
        onClick={() => setExpanded((isExpanded) => !isExpanded)}
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
        aria-label="Movie search"
        aria-hidden={!expanded}
        inert={!expanded}
        onSubmit={(event) => {
          event.preventDefault();
          const query = inputRef.current?.value.trim();
          if (query) navigate(`/search/${encodeURIComponent(query)}`);
        }}
      >
        <label className="visually-hidden" htmlFor={inputId}>
          Movie title
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          placeholder="Search movies..."
          autoComplete="off"
          onKeyDown={handleKeyDown}
        />
      </form>
    </div>
  );
}
