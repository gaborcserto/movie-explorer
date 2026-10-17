import { useState, useEffect } from 'react';
import './details.scss';
import { Link, useParams } from 'react-router-dom';
import type { MovieDetails } from '@movie-explorer/contracts';
import useDetailPage from './useDetailPage';
import DetailsContent, { DetailsLowerContent } from './detailsContent';
import Error from '../../layouts/error';
import Loading from '../../layouts/loading';
import HeaderSearch from '../search/headerSearch';
import { getMovie, isNotFoundError } from '../../util/apiUtils';

type DetailsState = 'loading' | 'success' | 'not-found' | 'error';

function MovieDetailsPage({ movieIdStr }: { movieIdStr: string }) {
  const [detailsState, setDetailsState] = useState<DetailsState>('loading');
  const [attempt, setAttempt] = useState(0);

  const movieId = Number(movieIdStr);

  const [movieData, setMovieData] = useState<MovieDetails | null>(null);

  useEffect(() => {
    let current = true;
    if (!Number.isSafeInteger(movieId) || movieId <= 0) {
      setDetailsState('not-found');
      return undefined;
    }
    getMovie(movieId)
      .then((movie) => {
        if (!current) return;
        setMovieData(movie);
        setDetailsState('success');
      })
      .catch((error: unknown) => {
        if (!current) return;
        setMovieData(null);
        setDetailsState(isNotFoundError(error) ? 'not-found' : 'error');
      });
    return () => {
      current = false;
    };
  }, [movieId, attempt]);

  const pageTitle = {
    loading: 'Loading movie',
    success: movieData?.title || 'Movie details',
    'not-found': 'Movie not found',
    error: 'Unable to load movie',
  }[detailsState];
  const mainRef = useDetailPage(pageTitle);

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
          onAction={() => {
            setDetailsState('loading');
            setAttempt((value) => value + 1);
          }}
        />
      );
    }

    if (detailsState === 'success' && movieData) {
      return <DetailsContent movieData={movieData} />;
    }

    return null;
  };

  const isLoaded = detailsState === 'success' && movieData;

  return (
    <div className="detail-page">
      <header className="detail-page__navigation movie-details container">
        <div className="movie-details__top detail-header">
          <Link to="/search" className="movie-details__brand brand">
            <strong>Movie</strong> Explorer
          </Link>
          <HeaderSearch />
        </div>
      </header>
      <main ref={mainRef} tabIndex={-1} aria-label={pageTitle}>
        <div
          className="header header--movie-details detail-page__hero"
          data-testid="details-component"
        >
          <div className="movie-details container">{renderContent()}</div>
        </div>
        {isLoaded && <DetailsLowerContent movieData={movieData} />}
      </main>
    </div>
  );
}

export default function Details() {
  const { movieId = '' } = useParams();
  return <MovieDetailsPage key={movieId} movieIdStr={movieId} />;
}
