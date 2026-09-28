import { useCallback, useState, useEffect } from 'react';
import './details.scss';
import { Link, useParams } from 'react-router-dom';
import type { MovieDetails } from '@movie-explorer/contracts';
import DetailsContent from './detailsContent';
import Error from '../../layouts/error';
import Loading from '../../layouts/loading';
import { getMovie, isNotFoundError } from '../../util/apiUtils';

type DetailsState = 'loading' | 'success' | 'not-found' | 'error';

function Details() {
  const [detailsState, setDetailsState] = useState<DetailsState>('loading');
  const { movieId: movieIdStr } = useParams();

  const movieId = Number(movieIdStr);

  const [movieData, setMovieData] = useState<MovieDetails | null>(null);

  const loadMovie = useCallback(
    (isCurrentRequest: () => boolean = () => true) => {
      if (!Number.isInteger(movieId) || movieId <= 0) {
        setMovieData(null);
        setDetailsState('not-found');
        return;
      }

      setDetailsState('loading');

      getMovie(movieId)
        .then((movie) => {
          if (!isCurrentRequest()) return;

          setMovieData(movie);
          setDetailsState('success');
        })
        .catch((error: unknown) => {
          if (!isCurrentRequest()) return;

          setMovieData(null);
          setDetailsState(isNotFoundError(error) ? 'not-found' : 'error');
        });
    },
    [movieId]
  );

  useEffect(() => {
    let isCurrent = true;

    loadMovie(() => isCurrent);

    return () => {
      isCurrent = false;
    };
  }, [loadMovie]);

  const renderContent = () => {
    if (detailsState === 'loading') {
      return (
        <Loading className="movie-details__container movie-details__container--loading" />
      );
    }

    if (detailsState === 'not-found') {
      return (
        <Error
          title="Movie not found"
          message="We could not find that movie."
          className="movie-details__container movie-details__container--error"
        />
      );
    }

    if (detailsState === 'error') {
      return (
        <Error
          title="Unable to load movie"
          message="Something went wrong while loading this movie."
          className="movie-details__container movie-details__container--error"
          actionLabel="Try again"
          onAction={() => loadMovie()}
        />
      );
    }

    if (detailsState === 'success' && movieData) {
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
            <strong>Movie</strong> Explorer
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
