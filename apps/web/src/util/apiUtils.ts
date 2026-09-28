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

class ApiRequestError extends Error {
  constructor(public readonly status: number) {
    super(`API request failed with status ${status}`);
    this.name = 'ApiRequestError';
  }
}

function request<T>(
  url: string,
  init?: RequestInit,
  parseResponse?: true
): Promise<T>;
function request(
  url: string,
  init: RequestInit,
  parseResponse: false
): Promise<void>;
async function request<T>(
  url: string,
  init: RequestInit = {},
  parseResponse = true
): Promise<T | void> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new ApiRequestError(response.status);
  }

  if (!parseResponse) {
    return undefined;
  }

  return (await response.json()) as T;
}

export const isNotFoundError = (error: unknown): boolean => {
  return error instanceof ApiRequestError && error.status === 404;
};

export const postMovie = async (data: MovieMutationPayload): Promise<void> => {
  await request(
    moviesUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    false
  );
};

export const deleteMovie = async (id: number): Promise<void> => {
  await request(`${moviesUrl}/${id}`, { method: 'DELETE' }, false);
};

export const putMovie = async (
  data: MovieMutationPayload
): Promise<MovieDetails> => {
  return request<MovieDetails>(moviesUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

export const getMovie = async (id: number): Promise<MovieDetails> => {
  return request<MovieDetails>(`${moviesUrl}/${id}`);
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

  return request<MovieListResponse>(`${moviesUrl}?${query}`);
};
