import { useMemo } from 'react';
import './list.scss';
import { useParams, useSearchParams } from 'react-router-dom';
import { FaXmark } from 'react-icons/fa6';

import presentApiError from '../../util/errorPresentation';
import Card from '../card/card';
import Error from '../../layouts/error';
import Loading from '../../layouts/loading';
import { defaultSortOrder, sortParams } from '../../util/apiUtils';
import { movieHistorySignature, useSearchHistory } from './useSearchHistory';
import useMovieResults from './hooks/useMovieResults';

function List() {
  const history = useSearchHistory();
  const { searchQuery } = useParams();
  const [searchParams] = useSearchParams();
  const signature = movieHistorySignature(searchQuery, searchParams);
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

  const {
    moviesData,
    movies,
    visibleMovieCount,
    loadingData,
    loadingMore,
    errorData,
    loadMoreError,
    loadInitialMovies,
    loadMore,
  } = useMovieResults(params, signature, history?.movies);

  const capitalizeFirstLetter = (data: string) =>
    data.charAt(0).toUpperCase() + data.slice(1);

  const getEmptyMessage = () => {
    if (searchQuery && (filter || minimumRating) && moviesData?.totalResults) {
      return moviesData.page < Math.min(moviesData.totalPages, 500)
        ? 'No matching movies yet. Load more to continue.'
        : 'No matching movies found.';
    }
    const genre = filter ? capitalizeFirstLetter(filter) : null;
    if (searchQuery && genre) {
      return `No movies found for "${searchQuery}" in ${genre}.`;
    }
    if (searchQuery) {
      return `No movies found for "${searchQuery}".`;
    }
    if (genre) {
      return `No movies found in ${genre}.`;
    }
    return 'No movies available.';
  };

  if (loadingData && !errorData) {
    return (
      <Loading className="list__container container list__container--loading" />
    );
  }

  if (errorData) {
    return (
      <Error
        title={presentApiError(errorData)?.heading}
        message={presentApiError(errorData)?.description ?? ''}
        className="list__container container list__container--error"
        pending={loadingData}
        actionLabel="Try again"
        onAction={() => loadInitialMovies(true)}
      />
    );
  }

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
    if (key === 'sorting') {
      next.set('sorting', 'popularity');
    } else {
      next.delete(key);
    }
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
      {Boolean(loadMoreError) && (
        <div className="list__more-error" role="alert">
          <span>{presentApiError(loadMoreError)?.description}</span>
          <button
            type="button"
            className="btn btn--outline"
            disabled={loadingMore}
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
            className="btn btn--outline btn--action"
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
