import { useState, useRef, useEffect } from 'react';
import './card.scss';
import { Link, useSearchParams } from 'react-router-dom';
import type { MovieDetails, MovieSummary } from '@movie-explorer/contracts';
import CustomImage from '../utility/customImage';
import { getMovie } from '../../util/apiUtils';

interface CardProps {
  movie: MovieSummary;
  onEditMovie: (movie: MovieDetails) => void;
  onDeleteMovie: (movie: MovieSummary) => void;
  onMovieActionError: (error: string) => void;
}

function Card({
  movie,
  onEditMovie,
  onDeleteMovie,
  onMovieActionError,
}: CardProps) {
  const { id, title, releaseDate, posterUrl, genres } = movie;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hoverBtnRef = useRef<HTMLButtonElement>(null);
  const [searchParams] = useSearchParams();

  const filter = searchParams.get('filter');
  const sort = searchParams.get('sorting');
  const releaseYear = releaseDate.substring(0, 4);

  const handleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
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

  const handleOpenModal = async () => {
    try {
      const movieDetails = await getMovie(id);
      onEditMovie(movieDetails);
    } catch {
      onMovieActionError('Something went wrong while loading this movie.');
    }
  };

  const handleDeleteModal = () => {
    onDeleteMovie(movie);
  };

  const genreLinks = genres
    .map((genre) => {
      return (
        <span key={genre}>
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
        <button
          className="card__hover-btn"
          onClick={handleMenu}
          ref={hoverBtnRef}
          type="button"
          aria-label={`Menu for ${title}`}
          aria-expanded={isMenuOpen}
        />
        <CustomImage
          img_path={posterUrl}
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
            aria-label="Close movie actions"
          >
            x
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
