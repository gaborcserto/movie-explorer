import MovieImage from '../utility/customImage';
import type useAutocomplete from './useAutocomplete';
import './suggestions.scss';

type Props = { autocomplete: ReturnType<typeof useAutocomplete> };

export default function Suggestions({ autocomplete }: Props) {
  return (
    <>
      <span
        id={`${autocomplete.listId}-failure`}
        className={
          autocomplete.failed
            ? 'search-suggestions__failure'
            : 'visually-hidden'
        }
        role="status"
      >
        {autocomplete.message}
      </span>
      <div
        hidden={!autocomplete.open}
        aria-hidden={!autocomplete.open}
        inert={!autocomplete.open}
        className="search-suggestions"
        id={autocomplete.listId}
        role="listbox"
        aria-label="Movie and person suggestions"
      >
        {(['movie', 'person'] as const).map((type) => {
          const items = autocomplete.suggestions.filter(
            (item) => item.mediaType === type
          );
          if (!items.length) return null;
          return (
            <div
              key={type}
              role="group"
              aria-label={type === 'movie' ? 'Movies' : 'People'}
            >
              <div className="search-suggestions__heading" aria-hidden="true">
                {type === 'movie' ? 'Movies' : 'People'}
              </div>
              {items.map((item) => {
                const index = autocomplete.suggestions.indexOf(item);
                const name =
                  item.mediaType === 'movie' ? item.title : item.name;
                const metadata =
                  item.mediaType === 'movie'
                    ? item.releaseYear
                    : item.knownForDepartment;
                return (
                  <div
                    key={item.id}
                    id={`${autocomplete.listId}-${index}`}
                    role="option"
                    aria-label={`${name}${metadata ? `, ${metadata}` : ''}`}
                    tabIndex={-1}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') autocomplete.choose(item);
                    }}
                    aria-selected={autocomplete.active === index}
                    className={`search-suggestions__option${autocomplete.active === index ? ' is-active' : ''}`}
                    onMouseEnter={() => autocomplete.setActive(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => autocomplete.choose(item)}
                  >
                    <MovieImage
                      src={
                        item.mediaType === 'movie'
                          ? item.posterUrl
                          : item.profileUrl
                      }
                      alt=""
                      className="search-suggestions__image"
                    />
                    <span>
                      <strong>{name}</strong>
                      {metadata && <small>{metadata}</small>}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}
