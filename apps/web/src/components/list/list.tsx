import { useMemo, useState, useEffect } from 'react';
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
  const [errorData, setErrorData] = useState<unknown>();

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

  useEffect(() => {
    setLoadingData(true);
    setErrorData(undefined);
    getMovies(params)
      .then((movies) => {
        setMoviesData(movies);
      })
      .catch((error) => {
        setErrorData(error);
      })
      .finally(() => {
        setLoadingData(false);
      });
  }, [params, refreshKey]);

  const capitalizeFirstLetter = (data: string) => {
    return data.charAt(0).toUpperCase() + data.slice(1);
  };

  if (loadingData) {
    return (
      <Loading className="list__container container list__container--loading" />
    );
  }

  if (errorData) {
    return (
      <Error
        message={`Error: ${errorData}`}
        className="list__container container list__container--error"
      />
    );
  }

  const moviesList = moviesData?.movies;
  return (
    <section className="list__container container">
      <h2 className="list__number">
        <strong>{moviesData?.total}</strong> movies found
        {filter && (
          <span>
            {' '}
            in genre:{' '}
            <strong className="genre">{capitalizeFirstLetter(filter)}</strong>
          </span>
        )}
      </h2>
      <div className="list__items">
        {moviesList?.map((movieData: MovieSummary) => (
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
