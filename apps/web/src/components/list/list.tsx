import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';

import './list.scss';
import { useParams, useSearchParams } from 'react-router';
import { FaXmark } from 'react-icons/fa6';

import { genreLabel, sortLabel } from '../../i18n/labels';
import { i18n } from '../../i18n';
import presentApiError from '../../util/errorPresentation';
import Card from '../card';
import Error from '../../layouts/error';
import { ResultsSkeleton, CardSkeletons } from '../skeleton';
import { defaultSortOrder, sortParams } from '../../util/apiUtils';
import { movieHistorySignature, useSearchHistory } from './useSearchHistory';
import useMovieResults from './hooks/useMovieResults';
import { readFilters } from '../filter/filterState';

function List() {
  useTranslation();

  const history = useSearchHistory();
  const { searchQuery } = useParams();
  const [searchParams] = useSearchParams();

  const signature = movieHistorySignature(searchQuery, searchParams);
  const filters = readFilters(searchParams, Boolean(searchQuery));
  const filterValue = filters.filter.join(',');

  const filter = useMemo(
    () => (filterValue ? filterValue.split(',') : []),
    [filterValue]
  );
  const {
    year: releaseYear,
    rating: minimumRating,
    sorting: sort,
    order: sortOrder,
  } = filters;
  const [, setSearchParams] = useSearchParams();

  const params = useMemo(
    () => ({
      sort: searchQuery ? null : sort,
      sortOrder: searchQuery ? null : sortOrder,
      search: searchQuery,
      genres: filter.length > 1 ? filter : (filter[0] ?? null),
      releaseYear: releaseYear || null,
      minimumRating: minimumRating || null,
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
    genreLabel(data.charAt(0).toUpperCase() + data.slice(1));

  const getEmptyMessage = () => {
    if (
      searchQuery &&
      (filter.length || minimumRating) &&
      moviesData?.totalResults
    ) {
      return moviesData.page < Math.min(moviesData.totalPages, 500)
        ? i18n.t('ui.no_matching_movies_yet_load_more_to_continue')
        : i18n.t('ui.no_matching_movies_found');
    }

    const genre = filter.length
      ? filter.map(capitalizeFirstLetter).join(i18n.t('ui.or'))
      : null;

    if (searchQuery && genre) {
      return i18n.t('messages.noMoviesGenreQuery', {
        query: searchQuery,
        genre,
      });
    }

    if (searchQuery) {
      return i18n.t('messages.noMoviesQuery', { query: searchQuery });
    }

    if (genre) {
      return i18n.t('messages.noMoviesGenre', { genre });
    }

    return i18n.t('ui.no_movies_available');
  };

  if (loadingData && !errorData) {
    return <ResultsSkeleton />;
  }

  if (errorData) {
    return (
      <Error
        title={presentApiError(errorData)?.heading}
        message={presentApiError(errorData)?.description ?? ''}
        className="list__container container list__container--error"
        pending={loadingData}
        actionLabel={i18n.t('ui.try_again')}
        onAction={() => loadInitialMovies(true)}
      />
    );
  }

  const hasMore = Boolean(
    moviesData &&
    (visibleMovieCount < movies.length ||
      moviesData.page < Math.min(moviesData.totalPages, 500))
  );

  const visibleMovies = movies.slice(0, visibleMovieCount);

  const sorting = sortParams(sort);
  const badges = [
    ...(filter.length
      ? filter.map((value) => ({
          key: `filter:${value}`,
          filter: value,
          label: capitalizeFirstLetter(value),
        }))
      : []),
    ...(releaseYear ? [{ key: 'year', label: releaseYear }] : []),
    ...(minimumRating
      ? [
          {
            key: 'rating',
            label: i18n.t('messages.ratingBadge', { rating: minimumRating }),
          },
        ]
      : []),
    ...(!searchQuery && sorting && sorting !== 'popularity'
      ? [
          {
            key: 'sorting',
            label: i18n.t('messages.sortBadge', { sort: sortLabel(sorting) }),
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
            label: i18n.t('messages.orderBadge', {
              order:
                sortOrder === 'asc'
                  ? i18n.t('ui.ascending')
                  : i18n.t('ui.descending'),
            }),
          },
        ]
      : []),
  ];

  const handleRemoveBadge = (key: string, genreValue?: string) => {
    const next = new URLSearchParams(searchParams);

    if (genreValue) {
      const remaining = filter.filter((value) => value !== genreValue);
      next.delete('filter');

      if (remaining.length) {
        next.set('filter', remaining.join(','));
      }
    } else if (key === 'sorting') {
      next.set('sorting', 'popularity');
    } else {
      next.delete(key);
    }

    setSearchParams(next);
  };

  const handleClearFilters = () => {
    const next = new URLSearchParams(searchParams);

    ['filter', 'year', 'rating', 'sorting', 'order'].forEach((key) =>
      next.delete(key)
    );
    setSearchParams(next);
  };

  return (
    <section className="list__container container" aria-busy={loadingMore}>
      {loadingMore && (
        <span role="status" className="visually-hidden">
          {i18n.t('ui.loading_more_movies')}
        </span>
      )}
      {badges.length > 0 && (
        <div
          className="active-filters"
          aria-label={i18n.t('ui.applied_movie_filters')}
        >
          {badges.map((badge) => {
            const badgeGenre = 'filter' in badge ? badge.filter : undefined;

            return (
              <button
                type="button"
                className="active-filters__badge"
                key={badge.key}
                aria-label={i18n.t(
                  badgeGenre
                    ? 'messages.removeGenreFilter'
                    : 'messages.removeFilter',
                  { label: badge.label }
                )}
                onClick={() => handleRemoveBadge(badge.key, badgeGenre)}
              >
                {badge.label}
                <FaXmark aria-hidden="true" />
              </button>
            );
          })}
          {badges.length > 1 && (
            <button
              type="button"
              className="active-filters__clear"
              onClick={handleClearFilters}
            >
              {i18n.t('ui.clear_all')}
            </button>
          )}
        </div>
      )}
      <div className="list__summary" aria-live="polite">
        <p className="list__loaded">
          {i18n.t(
            searchQuery && (filter.length > 0 || minimumRating)
              ? 'messages.matchingLoaded'
              : 'messages.loadedCount',
            {
              count: visibleMovies.length,
              kind: i18n.t('nouns.movies', { count: visibleMovies.length }),
            }
          )}
        </p>
        {searchQuery && (
          <p className="list__context">
            {i18n.t('ui.search')} <strong>&quot;{searchQuery}&quot;</strong>
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
            libraryMedia={{ mediaType: 'movie' }}
            loading={index === 0 ? 'eager' : 'lazy'}
          />
        ))}
        {loadingMore && <CardSkeletons count={10} />}
      </div>
      {Boolean(loadMoreError) && (
        <div className="list__more-error" role="alert">
          <span>{presentApiError(loadMoreError)?.description}</span>
          <button
            type="button"
            className="btn btn--outline"
            disabled={loadingMore}
            onClick={loadMore}
          >
            {i18n.t('ui.try_again')}
          </button>
        </div>
      )}
      {hasMore && !loadMoreError && (
        <div className="list__more">
          <button
            type="button"
            className="btn btn--outline btn--action"
            disabled={loadingMore}
            onClick={loadMore}
          >
            {loadingMore ? i18n.t('ui.loading_more') : i18n.t('ui.load_more')}
          </button>
        </div>
      )}
    </section>
  );
}

export default List;
