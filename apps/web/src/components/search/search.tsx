import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import type { MovieSuggestion } from '@movie-explorer/contracts';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getMovieSuggestions } from '../../util/apiUtils';
import './search.scss';

const AUTOCOMPLETE_DELAY_MS = 300;
const MINIMUM_QUERY_LENGTH = 2;
const suggestionListId = 'movie-search-suggestions';

function Search() {
  const { searchQuery } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLFormElement>(null);
  const [searchData, setSearchData] = useState('');
  const [suggestions, setSuggestions] = useState<MovieSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setSearchData(searchQuery ?? '');
  }, [searchQuery]);

  useEffect(() => {
    const query = searchData.trim();
    if (query.length < MINIMUM_QUERY_LENGTH || query === searchQuery) {
      setSuggestions([]);
      setIsOpen(false);
      return undefined;
    }

    const controller = new AbortController();
    let isCurrent = true;
    const timeout = window.setTimeout(() => {
      getMovieSuggestions(query, controller.signal)
        .then((response) => {
          if (!isCurrent) return;
          setSuggestions(response.suggestions);
          setActiveIndex(-1);
          setIsOpen(response.suggestions.length > 0);
        })
        .catch((error: unknown) => {
          if (!isCurrent) return;
          if (error instanceof DOMException && error.name === 'AbortError') {
            return;
          }
          setSuggestions([]);
          setIsOpen(false);
        });
    }, AUTOCOMPLETE_DELAY_MS);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [searchData, searchQuery]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchData(event.target.value);
  };

  const submitSearch = () => {
    const query = searchData.trim();
    setIsOpen(false);
    navigate(
      query
        ? `/search/${encodeURIComponent(query)}${location.search}`
        : `/search${location.search}`
    );
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitSearch();
  };

  const chooseSuggestion = (suggestion: MovieSuggestion) => {
    setIsOpen(false);
    navigate(`/movie/${suggestion.id}`);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!isOpen || suggestions.length === 0) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => {
        if (current < 0) return direction > 0 ? 0 : suggestions.length - 1;
        return (current + direction + suggestions.length) % suggestions.length;
      });
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      chooseSuggestion(suggestions[activeIndex]);
    }
  };

  return (
    <header className="header" data-testid="search-component">
      <div className="header__container container">
        <div className="header__top">
          <Link to="/search" className="header__brand brand">
            <strong>Movie</strong> Explorer
          </Link>
        </div>
        <h1 className="header__title">FIND YOUR MOVIE</h1>
        <form
          ref={containerRef}
          className="header__search"
          onSubmit={handleFormSubmit}
          role="search"
          autoComplete="off"
        >
          <div className="header__search__combobox">
            <label className="visually-hidden" htmlFor="movie-search">
              Search movies
            </label>
            <input
              id="movie-search"
              className="header__search__input"
              type="text"
              placeholder="What do you want to watch?"
              value={searchData}
              onChange={handleSearch}
              onKeyDown={handleKeyDown}
              onFocus={() => suggestions.length && setIsOpen(true)}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isOpen}
              aria-controls={suggestionListId}
              aria-activedescendant={
                activeIndex >= 0 ? `movie-suggestion-${activeIndex}` : undefined
              }
            />
            {isOpen && (
              <ul
                id={suggestionListId}
                className="header__suggestions"
                role="listbox"
                aria-label="Movie suggestions"
              >
                {suggestions.map((suggestion, index) => (
                  <li
                    id={`movie-suggestion-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    key={suggestion.id}
                  >
                    <button
                      type="button"
                      className={index === activeIndex ? 'is-active' : ''}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => chooseSuggestion(suggestion)}
                    >
                      {suggestion.posterUrl ? (
                        <img
                          src={suggestion.posterUrl}
                          alt=""
                          width="40"
                          height="60"
                          loading="lazy"
                        />
                      ) : (
                        <span
                          className="header__suggestions__placeholder"
                          aria-hidden="true"
                        />
                      )}
                      <span>
                        <strong>{suggestion.title}</strong>
                        {suggestion.releaseYear && (
                          <small>{suggestion.releaseYear}</small>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button className="btn--primary btn" type="submit">
            search
          </button>
        </form>
      </div>
    </header>
  );
}

export default Search;
