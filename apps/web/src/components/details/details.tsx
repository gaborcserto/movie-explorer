import { useState, useEffect } from 'react';
import './details.scss';
import { Link, useParams } from 'react-router-dom';
import type { MovieDetails, MovieSection } from '@movie-explorer/contracts';
import useDetailPage from './useDetailPage';
import DetailsContent, { DetailsLowerContent } from './detailsContent';
import DetailError from './detailError';
import presentApiError, {
  isCancelledError,
} from '../../util/errorPresentation';
import Loading from '../../layouts/loading';
import HeaderSearch from '../search/headerSearch';
import {
  getMovie,
  getMovieSection,
  isNotFoundError,
} from '../../util/apiUtils';
import parseDetailId from '../../util/detailId';

type DetailsState = 'loading' | 'success' | 'not-found' | 'error';

function MovieDetailsPage({ movieIdStr }: { movieIdStr: string }) {
  const [detailsState, setDetailsState] = useState<DetailsState>('loading');
  const [requestError, setRequestError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
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
    setPending(true);
    getMovie(movieId, controller.signal)
      .then((movie) => {
        if (!current || controller.signal.aborted) return;
        setMovieData(movie);
        setDetailsState('success');
      })
      .catch((error: unknown) => {
        if (!current || controller.signal.aborted) return;
        if (isCancelledError(error)) return;
        setRequestError(error);
        setMovieData(null);
        setDetailsState(isNotFoundError(error) ? 'not-found' : 'error');
      })
      .finally(() => {
        if (current) setPending(false);
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [movieId, validId, attempt]);

  const recoverSection = async (section: MovieSection, signal: AbortSignal) => {
    const result = await getMovieSection(movieId, section, signal);
    if (signal.aborted) return;
    setMovieData(
      (previous) =>
        previous && {
          ...previous,
          ...result,
          sections: {
            credits: previous.sections?.credits ?? { status: 'available' },
            videos: previous.sections?.videos ?? { status: 'available' },
            photos: previous.sections?.photos ?? { status: 'available' },
            [section]: { status: 'available' },
          },
        }
    );
  };

  const pageTitle = {
    loading: 'Loading movie',
    success: movieData?.title || 'Movie details',
    'not-found': validId ? 'Movie not found' : 'Invalid movie ID',
    error: pending
      ? 'Loading movie'
      : (presentApiError(requestError)?.heading ?? 'Movie details'),
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
        <DetailError
          heading={validId ? 'Movie not found' : 'Invalid movie ID'}
          description={
            validId
              ? 'We could not find that movie.'
              : 'Please use a valid positive whole-number movie ID.'
          }
        />
      );
    }

    if (detailsState === 'error') {
      return (
        <DetailError
          {...(presentApiError(requestError) ?? {
            heading: 'Something went wrong',
            description: 'Please try again.',
          })}
          pending={pending}
          retry={() => {
            setPending(true);
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
        {isLoaded && (
          <DetailsLowerContent
            movieData={movieData}
            recoverSection={recoverSection}
          />
        )}
      </main>
    </div>
  );
}

export default function Details() {
  const { movieId = '' } = useParams();
  return <MovieDetailsPage key={movieId} movieIdStr={movieId} />;
}
