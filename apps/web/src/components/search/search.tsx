import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { i18n } from '../../i18n';
import useAutocomplete from './useAutocomplete';
import Suggestions from './suggestions';
import './search.scss';

function Search() {
  useTranslation();

  const { searchQuery } = useParams();
  const { containerRef, ...autocomplete } = useAutocomplete(searchQuery);

  return (
    <header className="header page-hero" data-testid="search-component">
      <div className="header__container container">
        <h1 className="header__title">{i18n.t('ui.find_your_next_story')}</h1>
        <form
          className="header__search"
          role="search"
          autoComplete="off"
          onSubmit={(event) => {
            event.preventDefault();
            autocomplete.submit();
          }}
          onBlur={autocomplete.onBlur}
        >
          <div ref={containerRef} className="header__search__combobox">
            <label className="visually-hidden" htmlFor="movie-search">
              {i18n.t('ui.search_movies_series_and_people')}
            </label>
            <input
              id="movie-search"
              className="header__search__input"
              type="text"
              placeholder={i18n.t('ui.what_do_you_want_to_watch')}
              value={autocomplete.query}
              onChange={(event) => autocomplete.edit(event.target.value)}
              {...autocomplete.inputProps}
            />
            <Suggestions autocomplete={autocomplete} />
          </div>
          <button className="btn--primary btn" type="submit">
            {i18n.t('messages.searchAction')}
          </button>
        </form>
      </div>
    </header>
  );
}

export default Search;
