import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

import './details.scss';
import { useParams } from 'react-router';
import type { MovieDetails, MovieSection } from '@movie-explorer/contracts';

import usePreferencesStore from '../../features/preferences/preferencesStore';
import { i18n } from '../../i18n';
import DetailsPageLayout, { DetailsLowerLayout } from './detailsPageLayout';
import DetailsContent, { DetailsLowerContent } from './detailsContent';
import { DetailError } from './recovery';
import presentApiError, {
  isCancelledError,
} from '../../util/errorPresentation';
import { DetailHeroSkeleton, DetailSectionsSkeleton } from '../skeleton';
import {
  getMovie,
  getMovieSection,
  isNotFoundError,
} from '../../util/apiUtils';
import parseDetailId from '../../util/detailId';
import { useRatingsResource } from './ratings';
import { useWatchProvidersResource } from './watchProviders';
import { useLibraryStore } from '../../features/library/libraryStore';
import { EntityMetadata } from '../routeMetadata';

type DetailsState = 'loading' | 'success' | 'not-found' | 'error';

function MovieDetailsPage({ movieIdStr }: { movieIdStr: string }) {
  const guestPreferences = usePreferencesStore((state) => state.preferences);

  useTranslation();

  const movieId = parseDetailId(movieIdStr);
  const validId = Number.isSafeInteger(movieId);

  const [detailsState, setDetailsState] = useState<DetailsState>(
    validId ? 'loading' : 'not-found'
  );
  const [requestError, setRequestError] = useState<unknown>(null);
  const [pending, setPending] = useState(validId);
  const [attempt, setAttempt] = useState(0);

  const ratingResource = useRatingsResource('movie', movieId, validId);

  const [movieData, setMovieData] = useState<MovieDetails | null>(null);

  const providerResource = useWatchProvidersResource(
    'movies',
    movieId,
    validId
  );
  const updateSnapshot = useLibraryStore((state) => state.updateSnapshot);

  const [requestPreferences, setRequestPreferences] =
    useState(guestPreferences);

  if (requestPreferences !== guestPreferences) {
    setRequestPreferences(guestPreferences);
    setMovieData(null);
    setDetailsState(validId ? 'loading' : 'not-found');
    setPending(validId);
    setRequestError(null);
  }

  useEffect(() => {
    let current = true;

    if (!validId) {
      return undefined;
    }

    const controller = new AbortController();

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
  }, [movieId, validId, attempt, guestPreferences]);

  useEffect(() => {
    if (detailsState === 'success' && movieData) {
      updateSnapshot({
        mediaType: 'movie',
        id: movieData.id,
        title: movieData.title,
        posterUrl: movieData.posterUrl,
        releaseDate: movieData.releaseDate,
      });
    }
  }, [detailsState, movieData, updateSnapshot, guestPreferences]);

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
    loading: i18n.t('ui.loading_movie'),
    success: movieData?.title || i18n.t('ui.movie_details'),
    'not-found': validId
      ? i18n.t('ui.movie_not_found')
      : i18n.t('ui.invalid_movie_id'),
    error: pending
      ? i18n.t('ui.loading_movie')
      : (presentApiError(requestError)?.heading ?? i18n.t('ui.movie_details')),
  }[detailsState];

  const renderContent = () => {
    if (detailsState === 'loading') {
      return <DetailHeroSkeleton label={i18n.t('ui.loading_movie_details')} />;
    }

    if (detailsState === 'not-found') {
      return (
        <DetailError
          heading={
            validId
              ? i18n.t('ui.movie_not_found')
              : i18n.t('ui.invalid_movie_id')
          }
          description={
            validId
              ? i18n.t('ui.we_could_not_find_that_movie')
              : i18n.t('ui.please_use_a_valid_positive_whole_number_movie_id')
          }
        />
      );
    }

    if (detailsState === 'error') {
      return (
        <DetailError
          {...(presentApiError(requestError) ?? {
            heading: i18n.t('ui.something_went_wrong'),
            description: i18n.t('ui.please_try_again'),
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
          watchProviders={providerResource.providers}
          providerResource={providerResource}
          ratings={ratingResource.ratings}
          ratingsLoading={ratingResource.loading}
        />
      );
    }

    return null;
  };

  const isLoaded = detailsState === 'success' && movieData;

  return (
    <DetailsPageLayout title={pageTitle} hero={renderContent()}>
      {isLoaded && <EntityMetadata kind="movie" data={movieData} />}
      {detailsState === 'loading' && (
        <DetailsLowerLayout>
          <DetailSectionsSkeleton />
        </DetailsLowerLayout>
      )}
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
  useTranslation();

  const { movieId = '' } = useParams();

  return <MovieDetailsPage key={movieId} movieIdStr={movieId} />;
}
