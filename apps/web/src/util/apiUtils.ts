import axios from 'axios';
import type {
  MovieDetails,
  MovieListResponse,
  MovieMutationPayload,
  MovieQueryParams,
  MovieSortField,
} from '@movie-explorer/contracts';
import type { URLParams } from '../types';

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const apiBaseUrl = (configuredApiBaseUrl ?? 'http://localhost:4000').replace(
  /\/+$/,
  ''
);
const moviesUrl = `${apiBaseUrl}/movies`;

export const isNotFoundError = (error: unknown): boolean => {
  return axios.isAxiosError(error) && error.response?.status === 404;
};

export const postMovie = async (data: MovieMutationPayload): Promise<void> => {
  await axios.post<void>(moviesUrl, data);
};

export const deleteMovie = async (id: number): Promise<void> => {
  await axios.delete<void>(`${moviesUrl}/${id}`);
};

export const putMovie = async (
  data: MovieMutationPayload
): Promise<MovieDetails> => {
  const response = await axios.put<MovieDetails>(moviesUrl, data);

  return response.data;
};

export const getMovie = async (id: number): Promise<MovieDetails> => {
  const response = await axios.get<MovieDetails>(`${moviesUrl}/${id}`);

  return response.data;
};

export const sortParams = (data: string | undefined | null): MovieSortField => {
  if (!data) return 'title';

  if (data === 'Release Date' || data === 'releaseDate') {
    return 'releaseDate';
  }

  if (data === 'Rating' || data === 'rating') {
    return 'rating';
  }

  return 'title';
};

export const getMovies = async (
  urlParams: URLParams
): Promise<MovieListResponse> => {
  const params: MovieQueryParams = {
    sort: sortParams(urlParams.sort),
    sortOrder: 'asc',
  };

  if (urlParams.search) {
    params.search = urlParams.search;
  }

  if (urlParams.genres) {
    params.genre = urlParams.genres;
  }

  const response = await axios.get<MovieListResponse>(moviesUrl, { params });

  return response.data;
};
