import { useTranslation } from 'react-i18next';

import { i18n } from '../../../i18n';
import MovieImage from '../../utility/customImage';
import type useAutocomplete from '../useAutocomplete';
import './suggestions.scss';

const groupLabels = {
  get movie() {
    return i18n.t('ui.movies');
  },
  get tv() {
    return i18n.t('ui.series');
  },
  get person() {
    return i18n.t('ui.people');
  },
};

type Props = {
  autocomplete: Omit<ReturnType<typeof useAutocomplete>, 'containerRef'>;
};

export default function Suggestions({ autocomplete }: Props) {
  useTranslation();

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
        aria-label={i18n.t('ui.movie_series_and_person_suggestions')}
      >
        {(['movie', 'tv', 'person'] as const).map((type) => {
          const items = autocomplete.suggestions.filter(
            (item) => item.mediaType === type
          );

          if (!items.length) {
            return null;
          }

          return (
            <div key={type} role="group" aria-label={groupLabels[type]}>
              <div className="search-suggestions__heading" aria-hidden="true">
                {groupLabels[type]}
              </div>
              {items.map((item) => {
                const index = autocomplete.suggestions.indexOf(item);
                const name =
                  item.mediaType === 'person' ? item.name : item.title;
                let metadata: string | number | undefined;

                if (item.mediaType === 'movie') {
                  metadata = item.releaseYear;
                } else if (item.mediaType === 'tv') {
                  metadata = item.firstAirDate?.slice(0, 4);
                } else {
                  metadata = item.knownForDepartment;
                }

                return (
                  <div
                    key={item.id}
                    id={`${autocomplete.listId}-${index}`}
                    role="option"
                    aria-label={`${name}${metadata ? `, ${metadata}` : ''}`}
                    tabIndex={-1}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        autocomplete.choose(item);
                      }
                    }}
                    aria-selected={autocomplete.active === index}
                    className={`search-suggestions__option${autocomplete.active === index ? ' is-active' : ''}`}
                    onMouseEnter={() => autocomplete.setActive(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => autocomplete.choose(item)}
                  >
                    <MovieImage
                      src={
                        item.mediaType === 'person'
                          ? item.profileUrl
                          : item.posterUrl
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
