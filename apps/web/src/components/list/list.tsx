import { useCallback, useMemo, useState, useEffect } from 'react';
import './list.scss';
import { useParams, useSearchParams } from 'react-router-dom';
import type {
  MovieDetails,
  MovieListResponse,
  MovieSummary,
} from '@movie-explorer/contracts';
import Card from '../card/card';
import Error from '../../layouts/error';
import Loading from '../../layouts/loading';
import { getMovies } from '../../util/apiUtils';

interface ListProps {
  refreshKey: number;
  onEditMovie: (movie: MovieDetails) => void;
  onDeleteMovie: (movie: MovieSummary) => void;
  onMovieActionError: (error: string) => void;
}

function List({
  refreshKey,
  onEditMovie,
  onDeleteMovie,
  onMovieActionError,
}: ListProps) {
  const [moviesData, setMoviesData] = useState<MovieListResponse>();
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<unknown>(null);

  const [searchParams] = useSearchParams();
  const { searchQuery } = useParams();
  const filter = searchParams.get('filter');
  const sort = searchParams.get('sorting');

  const params = useMemo(
    () => ({
      sort,
      search: searchQuery,
      genres: filter,
    }),
    [sort, searchQuery, filter]
  );

  const capitalizeFirstLetter = (data: string) => {
    return data.charAt(0).toUpperCase() + data.slice(1);
  };

  const getEmptyMessage = () => {
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

  const loadMovies = useCallback(
    (isCurrentRequest: () => boolean = () => true) => {
      setLoadingData(true);
      setErrorData(null);

      getMovies(params)
        .then((movies) => {
          if (!isCurrentRequest()) return;

          setMoviesData(movies);
        })
        .catch((error: unknown) => {
          if (!isCurrentRequest()) return;

          setMoviesData(undefined);
          setErrorData(error);
        })
        .finally(() => {
          if (!isCurrentRequest()) return;

          setLoadingData(false);
        });
    },
    [params]
  );

  useEffect(() => {
    let isCurrent = true;

    loadMovies(() => isCurrent);

    return () => {
      isCurrent = false;
    };
  }, [loadMovies, refreshKey]);

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
        onAction={() => loadMovies()}
      />
    );
  }

  const moviesList = moviesData?.movies ?? [];
  const movieTotal = moviesData?.total ?? 0;

  return (
    <section className="list__container container">
      <h2 className="list__number" aria-live="polite">
        <strong>{movieTotal}</strong> movies found
        {filter && (
          <span>
            {' '}
            in genre:{' '}
            <strong className="genre">{capitalizeFirstLetter(filter)}</strong>
          </span>
        )}
      </h2>
      {moviesList.length === 0 && (
        <div className="list__state" role="status">
          {getEmptyMessage()}
        </div>
      )}
      <div className="list__items">
        {moviesList.map((movieData: MovieSummary) => (
          <Card
            key={movieData.id}
            movie={movieData}
            onEditMovie={onEditMovie}
            onDeleteMovie={onDeleteMovie}
            onMovieActionError={onMovieActionError}
          />
        ))}
      </div>
    </section>
  );
}

export default List;
