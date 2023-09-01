import { useState, useRef, useEffect } from 'react';
import './card.scss';
import { useDispatch } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import CustomImage from '../utility/customImage';
import { Movie } from '../../types';
import {
  setModalOpen,
  setModalType,
  setModalMovie,
} from '../../reducer/modalSlice';

interface CardProps {
  movie: Movie;
}

function Card({ movie }: CardProps) {
  const { id, title, release_date, poster_path, genres } = movie;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hoverBtnRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();

  const filter = searchParams.get('filter');
  const sort = searchParams.get('sorting');

  const dispatch = useDispatch();
  const releaseYear = release_date.substring(0, 4);

  const handleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    dispatch(setModalMovie(movie));
  };

  const handleCloseMenu = () => {
    setIsMenuOpen(false);
  };

  const handleOutsideClick = (event: MouseEvent) => {
    if (
      menuRef.current &&
      !menuRef.current.contains(event.target as Node) &&
      hoverBtnRef.current &&
      !hoverBtnRef.current.contains(event.target as Node)
    ) {
      setIsMenuOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const handleOpenModal = () => {
    dispatch(setModalOpen(true));
    dispatch(setModalType('edit'));
  };

  const handleDeleteModal = () => {
    dispatch(setModalOpen(true));
    dispatch(setModalType('delete'));
  };

  const genreLinks = genres
    .map((genre) => {
      return (
        <span key={Math.random()}>
          <Link
            to={`?filter=${genre.toLowerCase().replace(/ /g, '+')}${
              sort ? `&sorting=${sort}` : ''
            }`}
            className="card__type__link"
          >
            {genre}
          </Link>
        </span>
      );
    })
    .reduce((prev, curr) => (
      <>
        {prev}
        {', '}
        {curr}
      </>
    ));

  return (
    <div className="card">
      <div className="card__image__wrapper">
        <div
          className="card__hover-btn"
          onClick={handleMenu}
          onKeyDown={handleMenu}
          tabIndex={0}
          ref={hoverBtnRef}
          role="button"
          aria-label="Menu"
        />
        <CustomImage
          img_path={poster_path}
          img_title={title}
          img_style="card__image"
        />
      </div>
      <div className="card__footer">
        <div className="card__footer__part">
          <Link
            to={`/movie/${id}${
              filter || sort ? `?${searchParams.toString()}` : ''
            }`}
            className="card__title"
          >
            {title}
          </Link>
          <p className="card__type">{genreLinks}</p>
        </div>
        <div className="card__footer__part">
          <p className="card__date">{releaseYear}</p>
        </div>
      </div>
      {isMenuOpen && (
        <div className="card__menu" ref={menuRef}>
          <button
            className="card__menu__close"
            onClick={handleCloseMenu}
            type="button"
          >
            ✖
          </button>
          <button
            className="card__menu__btn"
            onClick={handleOpenModal}
            type="button"
          >
            Edit
          </button>
          <button
            className="card__menu__btn"
            onClick={handleDeleteModal}
            type="button"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default Card;
