import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import './search.scss';

function Search() {
  const { searchQuery } = useParams();
  const [searchData, setSearchData] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setSearchData(searchQuery ?? '');
  }, [searchQuery]);

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchData(event.target.value);
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(`/search/${searchData}`);
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
          className="header__search"
          onSubmit={handleFormSubmit}
          role="search"
        >
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
          />
          <button className="btn--primary btn" type="submit">
            search
          </button>
        </form>
      </div>
    </header>
  );
}

export default Search;
