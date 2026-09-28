import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import './search.scss';
import { setMoviesSearch } from '../../reducer/moviesSlice';
import {
  setModalOpen,
  setModalType,
  setModalMovie,
} from '../../reducer/modalSlice';

function Search() {
  const { searchQuery } = useParams();
  const [searchData, setSearchData] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (searchQuery) {
      setSearchData(searchQuery);
      dispatch(setMoviesSearch(searchQuery));
    }

    if (location.pathname === '/search' && !searchQuery) {
      setSearchData('');
      dispatch(setMoviesSearch(''));
    }
  }, [dispatch, location.pathname, searchQuery]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchData(event.target.value);
  };

  const handleFormSubmit = (e: { preventDefault: () => void }) => {
    if (e) e.preventDefault();
    dispatch(setMoviesSearch(searchData));
    navigate(`/search/${searchData}`);
  };

  const openAddMovieModal = () => {
    dispatch(setModalOpen(true));
    dispatch(setModalType('add'));
    dispatch(setModalMovie(undefined));
  };

  return (
    <header className="header" data-testid="search-component">
      <div className="header__container container">
        <div className="header__top">
          <Link to="/search" className="header__brand brand">
            <strong>netflix</strong>roulette
          </Link>
          <button
            className="btn--transparent btn"
            onClick={openAddMovieModal}
            type="button"
          >
            + Add movie
          </button>
        </div>
        <h1 className="header__title">FIND YOUR MOVIE</h1>
        <form className="header__search" onSubmit={handleFormSubmit}>
          <input
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
