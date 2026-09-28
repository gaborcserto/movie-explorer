import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import './search.scss';

interface SearchProps {
  onAddMovie: () => void;
}

function Search({ onAddMovie }: SearchProps) {
  const { searchQuery } = useParams();
  const [searchData, setSearchData] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (searchQuery) {
      setSearchData(searchQuery);
    }

    if (location.pathname === '/search' && !searchQuery) {
      setSearchData('');
    }
  }, [location.pathname, searchQuery]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchData(event.target.value);
  };

  const handleFormSubmit = (e: { preventDefault: () => void }) => {
    if (e) e.preventDefault();
    navigate(`/search/${searchData}`);
  };

  return (
    <header className="header" data-testid="search-component">
      <div className="header__container container">
        <div className="header__top">
          <Link to="/search" className="header__brand brand">
            <strong>Movie</strong> Roulette
          </Link>
          <button
            className="btn--transparent btn"
            onClick={onAddMovie}
            type="button"
          >
            + Add movie
          </button>
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
