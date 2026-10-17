import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
} from 'react';
import './list.scss';
import { useParams, useSearchParams } from 'react-router-dom';
import { FaXmark } from 'react-icons/fa6';
import type {
  MovieListResponse,
  MovieSummary,
} from '@movie-explorer/contracts';
import Card from '../card/card';
import Error from '../../layouts/error';
import Loading from '../../layouts/loading';
import { defaultSortOrder, getMovies, sortParams } from '../../util/apiUtils';
import {
  movieHistorySignature,
  useResultHistory,
  useSearchHistory,
} from './useSearchHistory';

const MOVIE_BATCH_SIZE = 10;

function appendUniqueMovies(
  current: MovieSummary[],
  incoming: MovieSummary[]
): MovieSummary[] {
  const moviesById = new Map(current.map((movie) => [movie.id, movie]));
  incoming.forEach((movie) => moviesById.set(movie.id, movie));
  return [...moviesById.values()];
}

function List() {
  const history = useSearchHistory();
  const { searchQuery } = useParams();
  const [searchParams] = useSearchParams();
  const signature = movieHistorySignature(searchQuery, searchParams);
  const { restored, save } = useResultHistory(history?.movies, signature);
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
  const [loadMoreError, setLoadMoreError] = useState(false);
  const loadingMoreRef = useRef(false);
  const queryGenerationRef = useRef(0);
  const requestControllerRef = useRef<AbortController | null>(null);

  const filter = searchParams.get('filter');
  const releaseYear = searchParams.get('year');
  const minimumRating = searchParams.get('rating');
  const sort = searchParams.get('sorting');
  const sortOrder = searchParams.get('order');
  const [, setSearchParams] = useSearchParams();

  const params = useMemo(
    () => ({
      sort: searchQuery ? null : sort,
      sortOrder: searchQuery ? null : sortOrder,
      search: searchQuery,
      genres: filter,
      releaseYear,
      minimumRating,
    }),
    [sort, sortOrder, searchQuery, filter, releaseYear, minimumRating]
  );

  const capitalizeFirstLetter = (data: string) =>
    data.charAt(0).toUpperCase() + data.slice(1);

  const getEmptyMessage = () => {
    if (searchQuery && (filter || minimumRating) && moviesData?.totalResults) {
      return moviesData.page < Math.min(moviesData.totalPages, 500)
        ? 'No matches in the pages checked so far. Load more to check the next page.'
        : 'No matches in the accessible result pages.';
    }
    const genre = filter ? capitalizeFirstLetter(filter) : null;
    if (searchQuery && genre) {
      return `No movies found for "${searchQuery}" in ${genre}.`;
    }
    if (searchQuery) return `No movies found for "${searchQuery}".`;
    if (genre) return `No movies found in ${genre}.`;
    return 'No movies available.';
  };

  const loadInitialMovies = useCallback(() => {
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
    setErrorData(null);
    setLoadMoreError(false);

    return getMovies({ ...params, page: 1 }, signal)
      .then((response) => {
        if (!isCurrentRequest()) return;
        setMoviesData(response);
        setMovies(appendUniqueMovies([], response.movies));
        setVisibleMovieCount(MOVIE_BATCH_SIZE);
      })
      .catch((error: unknown) => {
        if (!isCurrentRequest()) return;
        if (error instanceof DOMException && error.name === 'AbortError')
          return;
        setMoviesData(undefined);
        setMovies([]);
        setVisibleMovieCount(MOVIE_BATCH_SIZE);
        setErrorData(error);
      })
      .finally(() => {
        if (isCurrentRequest()) setLoadingData(false);
      });
  }, [params]);

  useEffect(() => {
    if (!restored) loadInitialMovies();
    else requestControllerRef.current = new AbortController();
    return () => requestControllerRef.current?.abort();
  }, [loadInitialMovies, restored]);

  useLayoutEffect(() => {
    if (moviesData && !loadingData)
      save({ data: moviesData, items: movies, visible: visibleMovieCount });
  }, [save, moviesData, movies, visibleMovieCount, loadingData]);

  const loadMore = async () => {
    if (!requestControllerRef.current && restored)
      requestControllerRef.current = new AbortController();
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
      setLoadMoreError(false);
      return;
    }

    loadingMoreRef.current = true;
    const queryGeneration = queryGenerationRef.current;
    const isCurrentRequest = () =>
      !signal.aborted && queryGeneration === queryGenerationRef.current;
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const response = await getMovies(
        { ...params, page: moviesData.page + 1 },
        signal
      );
      if (!isCurrentRequest()) return;
      setMoviesData(response);
      setMovies((current) => appendUniqueMovies(current, response.movies));
      setVisibleMovieCount(
        (current) => Math.min(current, movies.length) + MOVIE_BATCH_SIZE
      );
    } catch {
      if (!isCurrentRequest()) return;
      setLoadMoreError(true);
    } finally {
      if (isCurrentRequest()) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  };

  if (loadingData) {
    return (
      <Loading className="list__container container list__container--loading" />
    );
  }

  if (errorData) {
    return (
      <Error
        title="Unable to load movies"
        message="Something went wrong while loading movies."
        className="list__container container list__container--error"
        actionLabel="Try again"
        onAction={() => loadInitialMovies()}
      />
    );
  }

  const movieTotal = moviesData?.totalResults ?? 0;
  const genre = filter ? capitalizeFirstLetter(filter) : null;
  const hasActiveContext = Boolean(
    genre || searchQuery || releaseYear || minimumRating
  );
  const hasMore = Boolean(
    moviesData &&
    (visibleMovieCount < movies.length ||
      moviesData.page < Math.min(moviesData.totalPages, 500))
  );
  const hasPageLevelSearchFilters = Boolean(
    searchQuery && (filter || minimumRating)
  );
  const visibleMovies = movies.slice(0, visibleMovieCount);
  const sorting = sortParams(sort);
  const badges = [
    ...(filter
      ? [{ key: 'filter', label: filter[0].toUpperCase() + filter.slice(1) }]
      : []),
    ...(releaseYear ? [{ key: 'year', label: releaseYear }] : []),
    ...(minimumRating
      ? [{ key: 'rating', label: `Rating ${minimumRating}+` }]
      : []),
    ...(!searchQuery && sorting && sorting !== 'popularity'
      ? [
          {
            key: 'sorting',
            label: `Sort: ${sorting === 'releaseDate' ? 'Release Date' : sorting[0].toUpperCase() + sorting.slice(1)}`,
          },
        ]
      : []),
    ...(!searchQuery &&
    sorting &&
    sortOrder &&
    sortOrder !== defaultSortOrder(sorting)
      ? [
          {
            key: 'order',
            label: `Order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`,
          },
        ]
      : []),
  ];
  const removeBadge = (key: string) => {
    const next = new URLSearchParams(searchParams);
    if (key === 'sorting') next.set('sorting', 'popularity');
    else next.delete(key);
    setSearchParams(next);
  };
  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    ['filter', 'year', 'rating', 'sorting', 'order'].forEach((key) =>
      next.delete(key)
    );
    setSearchParams(next);
  };

  return (
    <section className="list__container container">
      {badges.length > 0 && (
        <div className="active-filters" aria-label="Applied movie filters">
          {badges.map(({ key, label }) => (
            <button
              type="button"
              className="active-filters__badge"
              key={key}
              aria-label={`Remove ${label} ${key === 'filter' ? 'genre ' : ''}filter`}
              onClick={() => removeBadge(key)}
            >
              {label}
              <FaXmark aria-hidden="true" />
            </button>
          ))}
          {badges.length > 1 && (
            <button
              type="button"
              className="active-filters__clear"
              onClick={clearFilters}
            >
              Clear all
            </button>
          )}
        </div>
      )}
      <div className="list__summary" aria-live="polite">
        <h2 className="list__number">
          <strong>{movieTotal}</strong>{' '}
          {hasPageLevelSearchFilters ? 'text search results' : 'movies found'}
        </h2>
        <p className="list__loaded">
          {visibleMovies.length} {hasPageLevelSearchFilters ? 'matching ' : ''}
          {visibleMovies.length === 1 ? 'movie' : 'movies'} loaded
        </p>
        {hasActiveContext && (
          <p className="list__context">
            {searchQuery && (
              <span>
                Search: <strong>&quot;{searchQuery}&quot;</strong>
              </span>
            )}
            {genre && (
              <span>
                Genre: <strong>{genre}</strong>
              </span>
            )}
            {releaseYear && (
              <span>
                Year: <strong>{releaseYear}</strong>
              </span>
            )}
            {minimumRating && (
              <span>
                Rating: <strong>{minimumRating}+</strong>
              </span>
            )}
          </p>
        )}
      </div>
      {movies.length === 0 && (
        <div className="list__state" role="status">
          {getEmptyMessage()}
        </div>
      )}
      <div className="list__items">
        {visibleMovies.map((movie, index) => (
          <Card
            key={movie.id}
            movie={movie}
            loading={index === 0 ? 'eager' : 'lazy'}
          />
        ))}
      </div>
      {loadMoreError && (
        <div className="list__more-error" role="alert">
          <span>Unable to load more movies.</span>
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => loadMore()}
          >
            Try again
          </button>
        </div>
      )}
      {hasMore && !loadMoreError && (
        <div className="list__more">
          <button
            type="button"
            className={`btn ${searchQuery ? 'btn--primary' : 'btn--outline btn--action'}`}
            disabled={loadingMore}
            onClick={() => loadMore()}
          >
            {loadingMore ? 'Loading more…' : 'Load more'}
          </button>
        </div>
      )}
    </section>
  );
}

export default List;
