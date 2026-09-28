import axios from 'axios';
import { Movie, MovieData, Movies, URLParams } from '../types';

type MovieSort = 'title' | 'releaseDate' | 'rating';
type SortOrder = 'asc' | 'desc';

interface MoviesQueryParams {
  search?: string;
  sort: MovieSort;
  sortOrder: SortOrder;
  genre?: string;
}

const configuredApiBaseUrl =
  typeof process !== 'undefined' ? process.env.VITE_API_BASE_URL : undefined;
const apiBaseUrl = (configuredApiBaseUrl ?? 'http://localhost:4000').replace(
  /\/+$/,
  ''
);
const moviesUrl = `${apiBaseUrl}/movies`;

export const postMovie = async (data: MovieData): Promise<void> => {
  await axios.post<void>(moviesUrl, data);
};

export const deleteMovie = async (id: number): Promise<void> => {
  await axios.delete<void>(`${moviesUrl}/${id}`);
};

export const putMovie = async (data: MovieData): Promise<Movie> => {
  const response = await axios.put<Movie>(moviesUrl, data);

  return response.data;
};

export const getMovie = async (id: number): Promise<Movie> => {
  const response = await axios.get<Movie>(`${moviesUrl}/${id}`);

  return response.data;
};

export const sortParams = (data: string | undefined | null): MovieSort => {
  if (!data) return 'title';

  if (data === 'Release Date' || data === 'releaseDate') {
    return 'releaseDate';
  }

  if (data === 'Rating' || data === 'rating') {
    return 'rating';
  }

  return 'title';
};

export const getMovies = async (urlParams: URLParams): Promise<Movies> => {
  const params: MoviesQueryParams = {
    sort: sortParams(urlParams.sort),
    sortOrder: 'asc',
  };

  if (urlParams.search) {
    params.search = urlParams.search;
  }

  if (urlParams.genres) {
    params.genre = urlParams.genres;
  }

  const response = await axios.get<Movies>(moviesUrl, { params });

  return response.data;
};
