import { Link, useParams } from 'react-router-dom';
import useAutocomplete from './useAutocomplete';
import Suggestions from './suggestions';
import './search.scss';

function Search() {
  const { searchQuery } = useParams();
  const autocomplete = useAutocomplete(searchQuery);
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
          className="header__search"
          role="search"
          autoComplete="off"
          onSubmit={(event) => {
            event.preventDefault();
            autocomplete.submit();
          }}
          onBlur={autocomplete.onBlur}
        >
          <div
            ref={autocomplete.containerRef}
            className="header__search__combobox"
          >
            <label className="visually-hidden" htmlFor="movie-search">
              Search movies and people
            </label>
            <input
              id="movie-search"
              className="header__search__input"
              type="text"
              placeholder="What do you want to watch?"
              value={autocomplete.query}
              onChange={(event) => autocomplete.edit(event.target.value)}
              {...autocomplete.inputProps}
            />
            <Suggestions autocomplete={autocomplete} />
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
