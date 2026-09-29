import type {
  MovieDetails,
  MovieListResponse,
  MovieQueryParams,
  MovieSortField,
  MovieSortOrder,
  MovieSuggestionsResponse,
} from '@movie-explorer/contracts';
import type { URLParams } from '../types';

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const apiBaseUrl = (configuredApiBaseUrl ?? 'http://localhost:4000').replace(
  /\/+$/,
  ''
);
const moviesUrl = `${apiBaseUrl}/movies`;

class ApiRequestError extends Error {
  constructor(public readonly status: number) {
    super(`API request failed with status ${status}`);
    this.name = 'ApiRequestError';
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new ApiRequestError(response.status);
  }

  return (await response.json()) as T;
}

export const isNotFoundError = (error: unknown): boolean => {
  return error instanceof ApiRequestError && error.status === 404;
};

export const getMovie = async (id: number): Promise<MovieDetails> => {
  return request<MovieDetails>(`${moviesUrl}/${id}`);
};

export const sortParams = (
  data: string | undefined | null
): MovieSortField | undefined => {
  if (!data || data === 'Popularity' || data === 'popularity') {
    return 'popularity';
  }

  if (data === 'Relevance' || data === 'relevance') return undefined;

  if (data === 'Release Date' || data === 'releaseDate') {
    return 'releaseDate';
  }

  if (data === 'Rating' || data === 'rating') {
    return 'rating';
  }

  if (data === 'Title' || data === 'title') return 'title';

  return 'popularity';
};

export const defaultSortOrder = (sort: MovieSortField): MovieSortOrder =>
  sort === 'title' ? 'asc' : 'desc';

export const sortOrderParams = (
  data: string | undefined | null,
  sort: MovieSortField | undefined
): MovieSortOrder | undefined => {
  if (!sort) return undefined;
  if (data === 'asc' || data === 'desc') return data;
  return defaultSortOrder(sort);
};

export const getMovies = async (
  urlParams: URLParams,
  signal?: AbortSignal
): Promise<MovieListResponse> => {
  const sort = urlParams.search ? undefined : sortParams(urlParams.sort);
  const params: MovieQueryParams = {};

  if (sort) {
    params.sort = sort;
    params.sortOrder = sortOrderParams(urlParams.sortOrder, sort);
  }

  if (urlParams.search) {
    params.search = urlParams.search;
  }

  if (urlParams.genres) {
    params.genre = urlParams.genres;
  }

  const releaseYear = Number(urlParams.releaseYear);
  if (Number.isInteger(releaseYear) && releaseYear >= 1874) {
    params.releaseYear = releaseYear;
  }

  const minimumRating = Number(urlParams.minimumRating);
  if (
    urlParams.minimumRating &&
    Number.isFinite(minimumRating) &&
    minimumRating >= 0 &&
    minimumRating <= 10
  ) {
    params.minimumRating = minimumRating;
  }

  if (urlParams.page && urlParams.page > 1) {
    params.page = urlParams.page;
  }

  const query = new URLSearchParams(
    Object.entries(params).reduce<Record<string, string>>(
      (entries, [key, value]) => {
        if (value !== undefined) {
          entries[key] = value;
        }
        return entries;
      },
      {}
    )
  );

  const queryString = query.toString();
  return request<MovieListResponse>(
    queryString ? `${moviesUrl}?${queryString}` : moviesUrl,
    signal ? { signal } : {}
  );
};

export const getMovieSuggestions = async (
  query: string,
  signal?: AbortSignal
): Promise<MovieSuggestionsResponse> => {
  const params = new URLSearchParams({ query, limit: '6' });
  return request<MovieSuggestionsResponse>(
    `${moviesUrl}/suggestions?${params.toString()}`,
    signal ? { signal } : {}
  );
};
