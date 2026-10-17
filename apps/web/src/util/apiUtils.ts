import type {
  MovieDetails,
  MovieListResponse,
  MovieQueryParams,
  MovieSortField,
  MovieSortOrder,
  MovieSuggestionsResponse,
  PersonDetails,
  PersonListResponse,
  SearchSuggestionsResponse,
} from '@movie-explorer/contracts';
import type { URLParams } from '../types';

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const apiBaseUrl = (configuredApiBaseUrl ?? 'http://localhost:4000').replace(
  /\/+$/,
  ''
);
const moviesUrl = `${apiBaseUrl}/movies`;

export type ApiErrorCategory =
  | 'invalid-request'
  | 'not-found'
  | 'rate-limited'
  | 'internal-server'
  | 'service-unavailable'
  | 'http'
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'invalid-response';

export class ApiRequestError extends Error {
  constructor(
    public readonly category: ApiErrorCategory,
    public readonly status?: number,
    public readonly retryAfterSeconds?: number
  ) {
    super(`API request failed: ${category}`);
    this.name = 'ApiRequestError';
  }
}

export const API_REQUEST_TIMEOUT_MS = 12_000;

export function classifyHttpStatus(status: number): ApiErrorCategory {
  if (status === 400 || status === 422) return 'invalid-request';
  if (status === 404) return 'not-found';
  if (status === 429) return 'rate-limited';
  if (status === 500) return 'internal-server';
  if ([502, 503, 504].includes(status)) return 'service-unavailable';
  return 'http';
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const callerSignal = init.signal;
  const cancel = () => {
    if (!controller.signal.aborted) controller.abort('cancelled');
  };
  if (callerSignal?.aborted) cancel();
  else callerSignal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => {
    if (!controller.signal.aborted) controller.abort('timeout');
  }, API_REQUEST_TIMEOUT_MS);
  let status: number | undefined;
  try {
    controller.signal.throwIfAborted();
    const response = await fetch(url, { ...init, signal: controller.signal });
    status = response.status;
    controller.signal.throwIfAborted();
    if (!response.ok) {
      const delay = response.headers?.get('Retry-After');
      const seconds = delay && /^\d+$/.test(delay) ? Number(delay) : undefined;
      const retryAfterSeconds =
        status === 429 &&
        seconds !== undefined &&
        Number.isSafeInteger(seconds) &&
        seconds > 0 &&
        seconds <= 86_400
          ? seconds
          : undefined;
      throw new ApiRequestError(
        classifyHttpStatus(status),
        status,
        retryAfterSeconds
      );
    }
    try {
      const body: unknown = await response.json();
      controller.signal.throwIfAborted();
      return body as T;
    } catch {
      if (controller.signal.aborted) throw controller.signal.reason;
      throw new ApiRequestError('invalid-response', status);
    }
  } catch (error: unknown) {
    if (controller.signal.aborted) {
      throw new ApiRequestError(
        controller.signal.reason === 'timeout' ? 'timeout' : 'cancelled',
        status
      );
    }
    if (error instanceof ApiRequestError) throw error;
    throw new ApiRequestError('network', status);
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener('abort', cancel);
    // Release any unread error response body using this request's controller.
    controller.abort();
  }
}

export const isNotFoundError = (error: unknown): boolean => {
  return error instanceof ApiRequestError && error.status === 404;
};

export const getMovie = async (
  id: number,
  signal?: AbortSignal
): Promise<MovieDetails> => {
  return request<MovieDetails>(`${moviesUrl}/${id}`, signal ? { signal } : {});
};

export const getPerson = async (
  id: number,
  signal?: AbortSignal
): Promise<PersonDetails> => {
  return request<PersonDetails>(
    `${apiBaseUrl}/api/v1/persons/${id}`,
    signal ? { signal } : {}
  );
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

export const getSearchSuggestions = (
  query: string,
  signal?: AbortSignal
): Promise<SearchSuggestionsResponse> => {
  const params = new URLSearchParams({ query, limit: '6' });
  return request<SearchSuggestionsResponse>(
    `${apiBaseUrl}/api/v1/search/suggestions?${params}`,
    signal ? { signal } : {}
  );
};

export const getPeople = (
  query: string,
  page = 1,
  signal?: AbortSignal
): Promise<PersonListResponse> => {
  const params = new URLSearchParams({ query, page: String(page) });
  return request<PersonListResponse>(
    `${apiBaseUrl}/api/v1/persons?${params}`,
    signal ? { signal } : {}
  );
};
