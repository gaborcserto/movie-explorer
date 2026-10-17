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
import parseDetailId from '../../util/detailId';

type DetailsState = 'loading' | 'success' | 'not-found' | 'error';

function MovieDetailsPage({ movieIdStr }: { movieIdStr: string }) {
  const [detailsState, setDetailsState] = useState<DetailsState>('loading');
  const [attempt, setAttempt] = useState(0);

  const movieId = parseDetailId(movieIdStr);
  const validId = Number.isSafeInteger(movieId);

  const [movieData, setMovieData] = useState<MovieDetails | null>(null);

  useEffect(() => {
    let current = true;
    if (!validId) {
      setDetailsState('not-found');
      return undefined;
    }
    const controller = new AbortController();
    getMovie(movieId, controller.signal)
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
      controller.abort();
    };
  }, [movieId, validId, attempt]);

  const pageTitle = {
    loading: 'Loading movie',
    success: movieData?.title || 'Movie details',
    'not-found': validId ? 'Movie not found' : 'Invalid movie ID',
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
          title={validId ? 'Movie not found' : 'Invalid movie ID'}
          message={
            validId
              ? 'We could not find that movie.'
              : 'Please use a valid positive whole-number movie ID.'
          }
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
