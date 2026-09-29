import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import './list.scss';
import { useParams, useSearchParams } from 'react-router-dom';
import type {
  MovieListResponse,
  MovieSummary,
} from '@movie-explorer/contracts';
import Card from '../card/card';
import Error from '../../layouts/error';
import Loading from '../../layouts/loading';
import { getMovies } from '../../util/apiUtils';

function appendUniqueMovies(
  current: MovieSummary[],
  incoming: MovieSummary[]
): MovieSummary[] {
  const moviesById = new Map(current.map((movie) => [movie.id, movie]));
  incoming.forEach((movie) => moviesById.set(movie.id, movie));
  return [...moviesById.values()];
}

function List() {
  const [moviesData, setMoviesData] = useState<MovieListResponse>();
  const [movies, setMovies] = useState<MovieSummary[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorData, setErrorData] = useState<unknown>(null);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const loadingMoreRef = useRef(false);
  const queryGenerationRef = useRef(0);

  const [searchParams] = useSearchParams();
  const { searchQuery } = useParams();
  const filter = searchParams.get('filter');
  const releaseYear = searchParams.get('year');
  const minimumRating = searchParams.get('rating');
  const sort = searchParams.get('sorting');
  const sortOrder = searchParams.get('order');

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
    const genre = filter ? capitalizeFirstLetter(filter) : null;
    if (searchQuery && genre) {
      return `No movies found for "${searchQuery}" in ${genre}.`;
    }
    if (searchQuery) return `No movies found for "${searchQuery}".`;
    if (genre) return `No movies found in ${genre}.`;
    return 'No movies available.';
  };

  const loadInitialMovies = useCallback(
    (signal?: AbortSignal) => {
      setLoadingData(true);
      setErrorData(null);
      setLoadMoreError(false);

      return getMovies({ ...params, page: 1 }, signal)
        .then((response) => {
          if (signal?.aborted) return;
          setMoviesData(response);
          setMovies(appendUniqueMovies([], response.movies));
        })
        .catch((error: unknown) => {
          if (signal?.aborted) return;
          if (error instanceof DOMException && error.name === 'AbortError')
            return;
          setMoviesData(undefined);
          setMovies([]);
          setErrorData(error);
        })
        .finally(() => {
          if (!signal?.aborted) setLoadingData(false);
        });
    },
    [params]
  );

  useEffect(() => {
    queryGenerationRef.current += 1;
    loadingMoreRef.current = false;
    const controller = new AbortController();
    loadInitialMovies(controller.signal);
    return () => controller.abort();
  }, [loadInitialMovies]);

  const loadMore = async () => {
    if (
      !moviesData ||
      loadingMoreRef.current ||
      moviesData.page >= moviesData.totalPages
    ) {
      return;
    }

    loadingMoreRef.current = true;
    const queryGeneration = queryGenerationRef.current;
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const response = await getMovies({
        ...params,
        page: moviesData.page + 1,
      });
      if (queryGeneration !== queryGenerationRef.current) return;
      setMoviesData(response);
      setMovies((current) => appendUniqueMovies(current, response.movies));
    } catch {
      if (queryGeneration !== queryGenerationRef.current) return;
      setLoadMoreError(true);
    } finally {
      if (queryGeneration === queryGenerationRef.current) {
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
    moviesData && moviesData.page < moviesData.totalPages
  );
  const hasPageLevelSearchFilters = Boolean(
    searchQuery && (filter || minimumRating)
  );

  return (
    <section className="list__container container">
      <div className="list__summary" aria-live="polite">
        <h2 className="list__number">
          <strong>{movieTotal}</strong>{' '}
          {hasPageLevelSearchFilters ? 'text search results' : 'movies found'}
        </h2>
        <p className="list__loaded">
          {movies.length} {hasPageLevelSearchFilters ? 'matching ' : ''}
          {movies.length === 1 ? 'movie' : 'movies'} loaded
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
        {movies.map((movie) => (
          <Card key={movie.id} movie={movie} />
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
            className="btn btn--primary"
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
