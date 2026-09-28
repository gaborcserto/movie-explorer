import { useState, useEffect } from 'react';
import './details.scss';
import { Link, useParams } from 'react-router-dom';
import { Movie } from '../../types';
import DetailsContent from './detailsContent';
import Error from '../../layouts/error';
import Loading from '../../layouts/loading';
import { getMovie } from '../../util/apiUtils';

function Details() {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState();
  const { movieId: movieIdStr } = useParams();

  const movieId = Number(movieIdStr);

  const [movieData, setMovieData] = useState<Movie | null>(null);

  useEffect(() => {
    setIsLoading(true);
    getMovie(movieId)
      .then((movie) => {
        setMovieData(movie);
      })
      .catch((error) => {
        setIsError(error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [movieId]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <Loading className="movie-details__container movie-details__container--loading" />
      );
    }

    if (isError) {
      return (
        <Error
          message="Movies not found"
          className="movie-details__container movie-details__container--error"
        />
      );
    }

    if (movieData) {
      return <DetailsContent movieData={movieData} />;
    }

    return null;
  };

  return (
    <header
      className="header header--movie-details"
      data-testid="details-component"
    >
      <div className="movie-details container">
        <div className="movie-details__top">
          <Link to="/search" className="movie-details__brand brand">
            <strong>netflix</strong>roulette
          </Link>
          <Link className="movie-details__btn" type="button" to="/search">
            search
          </Link>
        </div>
        {renderContent()}
      </div>
    </header>
  );
}

export default Details;
