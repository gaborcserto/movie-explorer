import { useState, useEffect } from 'react';
import './details.scss';
import { useParams } from 'react-router-dom';
import type {
  MovieDetails,
  MovieSection,
  WatchProvider,
} from '@movie-explorer/contracts';
import DetailsPageLayout from './detailsPageLayout';
import DetailsContent, { DetailsLowerContent } from './detailsContent';
import { DetailError } from './recovery';
import presentApiError, {
  isCancelledError,
} from '../../util/errorPresentation';
import Loading from '../../layouts/loading';
import {
  getMovie,
  getMovieSection,
  getWatchProviders,
  isNotFoundError,
} from '../../util/apiUtils';
import parseDetailId from '../../util/detailId';
import useRatingsResource from './useRatingsResource';

type DetailsState = 'loading' | 'success' | 'not-found' | 'error';

function MovieDetailsPage({ movieIdStr }: { movieIdStr: string }) {
  const [detailsState, setDetailsState] = useState<DetailsState>('loading');
  const [requestError, setRequestError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const movieId = parseDetailId(movieIdStr);
  const validId = Number.isSafeInteger(movieId);
  const ratingResource = useRatingsResource('movie', movieId, validId);

  const [movieData, setMovieData] = useState<MovieDetails | null>(null);
  const [watchProviders, setWatchProviders] = useState<WatchProvider[]>([]);

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
        if (!current || controller.signal.aborted) {
          return;
        }

        setMovieData(movie);
        setDetailsState('success');
      })
      .catch((error: unknown) => {
        if (!current || controller.signal.aborted) {
          return;
        }
        if (isCancelledError(error)) {
          return;
        }

        setPending(false);
        setRequestError(error);
        setMovieData(null);
        setDetailsState(isNotFoundError(error) ? 'not-found' : 'error');
      })
      .finally(() => {
        if (current) {
          setPending(false);
        }
      });

    return () => {
      current = false;
      controller.abort();
    };
  }, [movieId, validId, attempt]);

  useEffect(() => {
    if (!validId || detailsState !== 'success') {
      return undefined;
    }

    const controller = new AbortController();

    Promise.resolve()
      .then(() => getWatchProviders('movies', movieId, controller.signal))
      .then(({ providers }) => {
        if (!controller.signal.aborted) {
          setWatchProviders(providers);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setWatchProviders([]);
        }
      });

    return () => controller.abort();
  }, [movieId, validId, detailsState]);

  const recoverSection = async (section: MovieSection, signal: AbortSignal) => {
    const result = await getMovieSection(movieId, section, signal);

    if (signal.aborted) {
      return;
    }

    setMovieData(
      (previous) =>
        previous && {
          ...previous,
          ...result,
          sections: {
            ...previous.sections,
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
      return (
        <DetailsContent
          movieData={movieData}
          watchProviders={watchProviders}
          ratings={ratingResource.ratings}
          ratingsError={ratingResource.error}
          ratingsLoading={ratingResource.loading}
          retryRatings={ratingResource.retry}
        />
      );
    }

    return null;
  };

  const isLoaded = detailsState === 'success' && movieData;

  return (
    <DetailsPageLayout title={pageTitle} hero={renderContent()}>
      {isLoaded && (
        <DetailsLowerContent
          movieData={movieData}
          recoverSection={recoverSection}
        />
      )}
    </DetailsPageLayout>
  );
}

export default function Details() {
  const { movieId = '' } = useParams();

  return <MovieDetailsPage key={movieId} movieIdStr={movieId} />;
}
