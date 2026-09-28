import { useMemo, useState, useEffect } from 'react';
import './list.scss';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import type {
  MovieListResponse,
  MovieSummary,
} from '@movie-explorer/contracts';
import Card from '../card/card';
import { RootState } from '../../store/store';
import Error from '../../layouts/error';
import Loading from '../../layouts/loading';
import { getMovies } from '../../util/apiUtils';
import { setHash } from '../../reducer/moviesSlice';

function List() {
  const { search, hash } = useSelector(
    (state: RootState) => state.movies,
    shallowEqual
  );
  const [moviesData, setMoviesData] = useState<MovieListResponse>();
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState();

  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const filter = searchParams.get('filter');
  const sort = searchParams.get('sorting');

  const params = useMemo(
    () => ({
      sort,
      search,
      genres: filter,
      hash,
    }),
    [sort, search, filter, hash]
  );

  useEffect(() => {
    setLoadingData(true);
    getMovies(params)
      .then((movies) => {
        setMoviesData(movies);
      })
      .catch((error) => {
        setErrorData(error);
      })
      .finally(() => {
        setLoadingData(false);
        dispatch(setHash('#loaded'));
      });
  }, [dispatch, params]);

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
          <Card key={movieData.id} movie={movieData} />
        ))}
      </div>
    </section>
  );
}

export default List;
