import {
  useCallback,
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
} from 'react';
import type {
  MovieListResponse,
  MovieSummary,
} from '@movie-explorer/contracts';

import type { URLParams } from '../../../types';
import { getMovies } from '../../../util/apiUtils';
import { isCancelledError } from '../../../util/errorPresentation';
import { useResultHistory } from '../useSearchHistory';
import type { MovieSnapshot } from '../useSearchHistory';

const MOVIE_BATCH_SIZE = 10;

function appendUniqueMovies(
  current: MovieSummary[],
  incoming: MovieSummary[]
): MovieSummary[] {
  const moviesById = new Map(current.map((movie) => [movie.id, movie]));
  incoming.forEach((movie) => moviesById.set(movie.id, movie));

  return [...moviesById.values()];
}

export default function useMovieResults(
  params: Omit<URLParams, 'page'>,
  signature: string,
  cache: Map<string, MovieSnapshot> | undefined
) {
  const { restored, save } = useResultHistory(cache, signature);
  const [moviesData, setMoviesData] = useState<MovieListResponse | undefined>(
    restored?.data
  );
  const [movies, setMovies] = useState<MovieSummary[]>(restored?.items ?? []);
  const [visibleMovieCount, setVisibleMovieCount] = useState(
    restored?.visible ?? MOVIE_BATCH_SIZE
  );
  const [loadingData, setLoadingData] = useState(!restored);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorData, setErrorData] = useState<unknown>(null);
  const [loadMoreError, setLoadMoreError] = useState<unknown>(null);
  const loadingInitialRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const queryGenerationRef = useRef(0);
  const requestControllerRef = useRef<AbortController | null>(null);

  const loadInitialMovies = useCallback(
    (retry = false) => {
      if (
        loadingInitialRef.current &&
        !requestControllerRef.current?.signal.aborted
      ) {
        return Promise.resolve();
      }

      loadingInitialRef.current = true;
      requestControllerRef.current?.abort();
      const controller = new AbortController();
      requestControllerRef.current = controller;
      const { signal } = controller;
      queryGenerationRef.current += 1;
      const queryGeneration = queryGenerationRef.current;
      const isCurrentRequest = () =>
        !signal.aborted && queryGeneration === queryGenerationRef.current;

      loadingMoreRef.current = false;
      setLoadingMore(false);
      setLoadingData(true);
      if (!retry) {
        setErrorData(null);
      }
      setLoadMoreError(null);

      return getMovies({ ...params, page: 1 }, signal)
        .then((response) => {
          if (!isCurrentRequest()) {
            return;
          }

          setErrorData(null);
          setLoadMoreError(null);
          setMoviesData(response);
          setMovies(appendUniqueMovies([], response.movies));
          setVisibleMovieCount(MOVIE_BATCH_SIZE);
        })
        .catch((error: unknown) => {
          if (!isCurrentRequest()) {
            return;
          }
          if (isCancelledError(error)) {
            return;
          }

          setMoviesData(undefined);
          setMovies([]);
          setVisibleMovieCount(MOVIE_BATCH_SIZE);
          setErrorData(error);
        })
        .finally(() => {
          if (isCurrentRequest()) {
            loadingInitialRef.current = false;
            setLoadingData(false);
          }
        });
    },
    [params]
  );

  useEffect(() => {
    if (!restored) {
      loadInitialMovies();
    } else {
      requestControllerRef.current = new AbortController();
    }

    return () => requestControllerRef.current?.abort();
  }, [loadInitialMovies, restored]);

  useLayoutEffect(() => {
    if (moviesData && !loadingData) {
      save({ data: moviesData, items: movies, visible: visibleMovieCount });
    }
  }, [save, moviesData, movies, visibleMovieCount, loadingData]);

  const loadMore = async () => {
    if (!requestControllerRef.current && restored) {
      requestControllerRef.current = new AbortController();
    }

    const signal = requestControllerRef.current?.signal;

    if (
      !signal ||
      signal.aborted ||
      loadingData ||
      !moviesData ||
      loadingMoreRef.current ||
      (visibleMovieCount >= movies.length &&
        moviesData.page >= Math.min(moviesData.totalPages, 500))
    ) {
      return;
    }

    if (visibleMovieCount < movies.length) {
      setVisibleMovieCount(
        (current) => Math.min(current, movies.length) + MOVIE_BATCH_SIZE
      );
      setLoadMoreError(null);

      return;
    }

    loadingMoreRef.current = true;
    const queryGeneration = queryGenerationRef.current;
    const isCurrentRequest = () =>
      !signal.aborted && queryGeneration === queryGenerationRef.current;
    setLoadingMore(true);
    try {
      const response = await getMovies(
        { ...params, page: moviesData.page + 1 },
        signal
      );

      if (!isCurrentRequest()) {
        return;
      }

      setLoadMoreError(null);
      setMoviesData(response);
      setMovies((current) => appendUniqueMovies(current, response.movies));
      setVisibleMovieCount(
        (current) => Math.min(current, movies.length) + MOVIE_BATCH_SIZE
      );
    } catch (error: unknown) {
      if (!isCurrentRequest() || isCancelledError(error)) {
        return;
      }

      setLoadMoreError(error);
    } finally {
      if (isCurrentRequest()) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  };

  return {
    moviesData,
    movies,
    visibleMovieCount,
    loadingData,
    loadingMore,
    errorData,
    loadMoreError,
    loadInitialMovies,
    loadMore,
  };
}
