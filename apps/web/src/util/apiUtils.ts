import type {
  MovieDetails,
  MovieSection,
  MovieSectionResponse,
  MovieListResponse,
  MovieQueryParams,
  MovieSortField,
  MovieSortOrder,
  MovieSuggestionsResponse,
  PersonDetails,
  PersonListResponse,
  SearchSuggestionsResponse,
  SeriesDetails,
  SeasonDetails,
  EpisodeDetails,
  EpisodeCredits,
} from '@movie-explorer/contracts';

import {
  record,
  availability,
  availabilityMap,
  movieSection,
  filmography,
  optionalText,
} from './partialValidation';
import type { URLParams } from '../types';
import {
  seriesDetails,
  seasonDetails,
  episodeDetails,
  episodeCredits,
} from './seriesValidation';

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const apiBaseUrl = (configuredApiBaseUrl ?? 'http://localhost:4000').replace(
  /\/+$/,
  ''
);
const moviesUrl = `${apiBaseUrl}/api/v1/movies`;

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
  switch (status) {
    case 400:
    case 422:
      return 'invalid-request';
    case 404:
      return 'not-found';
    case 429:
      return 'rate-limited';
    case 500:
      return 'internal-server';
    case 502:
    case 503:
    case 504:
      return 'service-unavailable';
    default:
      return 'http';
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const callerSignal = init.signal;
  const cancel = () => {
    if (!controller.signal.aborted) {
      controller.abort('cancelled');
    }
  };
  if (callerSignal?.aborted) {
    cancel();
  } else {
    callerSignal?.addEventListener('abort', cancel, { once: true });
  }

  const timer = setTimeout(() => {
    if (!controller.signal.aborted) {
      controller.abort('timeout');
    }
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
      if (controller.signal.aborted) {
        throw controller.signal.reason;
      }
      throw new ApiRequestError('invalid-response', status);
    }
  } catch (error: unknown) {
    if (controller.signal.aborted) {
      throw new ApiRequestError(
        controller.signal.reason === 'timeout' ? 'timeout' : 'cancelled',
        status
      );
    }
    if (error instanceof ApiRequestError) {
      throw error;
    }
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

export async function getSeries(
  id: number,
  signal?: AbortSignal
): Promise<SeriesDetails> {
  const body = await request<unknown>(`${apiBaseUrl}/api/v1/series/${id}`, {
    signal,
  });
  if (!seriesDetails(body, id)) {
    throw new ApiRequestError('invalid-response');
  }
  return body;
}

export async function getSeason(
  id: number,
  season: number,
  signal?: AbortSignal
): Promise<SeasonDetails> {
  const body = await request<unknown>(
    `${apiBaseUrl}/api/v1/series/${id}/seasons/${season}`,
    { signal }
  );
  if (!seasonDetails(body, id, season)) {
    throw new ApiRequestError('invalid-response');
  }
  return body;
}

export async function getEpisode(
  id: number,
  season: number,
  episode: number,
  signal?: AbortSignal
): Promise<EpisodeDetails> {
  const body = await request<unknown>(
    `${apiBaseUrl}/api/v1/series/${id}/seasons/${season}/episodes/${episode}`,
    { signal }
  );
  if (!episodeDetails(body, id, season, episode)) {
    throw new ApiRequestError('invalid-response');
  }
  return body;
}

export async function getEpisodeCredits(
  id: number,
  season: number,
  episode: number,
  signal?: AbortSignal
): Promise<EpisodeCredits> {
  const body = await request<unknown>(
    `${apiBaseUrl}/api/v1/series/${id}/seasons/${season}/episodes/${episode}/credits`,
    { signal }
  );
  if (!episodeCredits(body)) {
    throw new ApiRequestError('invalid-response');
  }
  return body;
}

export const getMovie = async (
  id: number,
  signal?: AbortSignal
): Promise<MovieDetails> => {
  const body = await request<MovieDetails>(
    `${moviesUrl}/${id}`,
    signal ? { signal } : {}
  );
  if (!record(body)) {
    throw new ApiRequestError('invalid-response');
  }
  // Optional metadata must not turn an otherwise usable movie into an error.
  (['originalTitle', 'status', 'originalLanguage'] as const).forEach((key) => {
    if (typeof body[key] !== 'string') {
      delete body[key];
    }
  });
  (['budget', 'revenue'] as const).forEach((key) => {
    const value = body[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      delete body[key];
    }
  });
  if (body.sections !== undefined) {
    if (
      !availabilityMap(body.sections, ['credits', 'videos', 'photos']) ||
      (body.sections.posters !== undefined &&
        !availability(body.sections.posters)) ||
      body.id !== id ||
      typeof body.title !== 'string' ||
      !Array.isArray(body.genres) ||
      !body.genres.every((genre) => typeof genre === 'string') ||
      !optionalText(body, [
        'description',
        'releaseDate',
        'posterSrcSet',
        'posterPreviewUrl',
        'backdropUrl',
      ]) ||
      !['rating', 'runtimeMinutes'].every(
        (key) =>
          body[key] === undefined ||
          (typeof body[key] === 'number' && Number.isFinite(body[key]))
      ) ||
      typeof body.posterUrl !== 'string'
    ) {
      throw new ApiRequestError('invalid-response');
    }

    const { sections } = body;
    (['credits', 'videos', 'photos', 'posters'] as const).forEach((section) => {
      if (!sections[section]) {
        return;
      }
      if (
        sections[section].status === 'available' &&
        !movieSection(body, section)
      ) {
        throw new ApiRequestError('invalid-response');
      }
      if (sections[section].status === 'unavailable') {
        if (section === 'credits') {
          body.cast = [];
          body.castMembers = [];
          body.director = undefined;
          body.directors = [];
          body.writers = [];
          body.producers = [];
        } else if (section === 'photos') {
          body.backdrops = [];
          body.photos = [];
        } else body[section] = [];
      }
    });
  }
  return body;
};

export const getPerson = async (
  id: number,
  signal?: AbortSignal
): Promise<PersonDetails> => {
  const body = await request<PersonDetails>(
    `${apiBaseUrl}/api/v1/persons/${id}`,
    signal ? { signal } : {}
  );
  if (!record(body)) {
    throw new ApiRequestError('invalid-response');
  }
  if (
    body.filmographyAvailability !== undefined &&
    (!availability(body.filmographyAvailability) ||
      body.id !== id ||
      typeof body.name !== 'string' ||
      !optionalText(body, [
        'biography',
        'knownForDepartment',
        'birthday',
        'deathDate',
        'placeOfBirth',
        'profileUrl',
        'profileSrcSet',
      ]) ||
      !filmography(body.filmography))
  ) {
    throw new ApiRequestError('invalid-response');
  }
  // Optional gallery metadata must never prevent the profile from rendering.
  if (
    body.profilePhotos !== undefined &&
    !movieSection({ photos: body.profilePhotos }, 'photos')
  ) {
    body.profilePhotos = undefined;
  } else {
    body.profilePhotos = body.profilePhotos?.filter(
      (photo) => photo.fullUrl.trim() && photo.thumbnailUrl.trim()
    );
  }
  return body;
};

export const getMovieSection = async (
  id: number,
  section: MovieSection,
  signal: AbortSignal
): Promise<MovieSectionResponse> => {
  const body = await request<MovieSectionResponse>(
    `${moviesUrl}/${id}/${section}`,
    { signal }
  );
  if (!movieSection(body, section)) {
    throw new ApiRequestError('invalid-response');
  }
  if (section === 'photos' && body.backdrops === undefined && body.photos) {
    body.backdrops = body.photos;
  }
  return body;
};

export const getFilmography = async (
  id: number,
  signal: AbortSignal
): Promise<Pick<PersonDetails, 'filmography'>> => {
  const body = await request<Pick<PersonDetails, 'filmography'>>(
    `${apiBaseUrl}/api/v1/persons/${id}/filmography`,
    { signal }
  );
  if (!record(body) || !filmography(body.filmography)) {
    throw new ApiRequestError('invalid-response');
  }
  return body;
};

export const sortParams = (
  data: string | undefined | null
): MovieSortField | undefined => {
  switch (data) {
    case null:
    case undefined:
    case '':
    case 'Popularity':
    case 'popularity':
      return 'popularity';
    case 'Relevance':
    case 'relevance':
      return undefined;
    case 'Release Date':
    case 'releaseDate':
      return 'releaseDate';
    case 'Rating':
    case 'rating':
      return 'rating';
    case 'Title':
    case 'title':
      return 'title';
    default:
      return 'popularity';
  }
};

export const defaultSortOrder = (sort: MovieSortField): MovieSortOrder =>
  sort === 'title' ? 'asc' : 'desc';

export const sortOrderParams = (
  data: string | undefined | null,
  sort: MovieSortField | undefined
): MovieSortOrder | undefined => {
  if (!sort) {
    return undefined;
  }
  if (data === 'asc' || data === 'desc') {
    return data;
  }
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

export const getSearchSuggestions = async (
  query: string,
  signal?: AbortSignal
): Promise<SearchSuggestionsResponse> => {
  const params = new URLSearchParams({ query, limit: '6' });
  const body = await request<SearchSuggestionsResponse>(
    `${apiBaseUrl}/api/v1/search/suggestions?${params}`,
    signal ? { signal } : {}
  );
  if (!record(body)) {
    throw new ApiRequestError('invalid-response');
  }
  if (
    body.groups !== undefined &&
    (!availabilityMap(body.groups, ['movie', 'person']) ||
      !Array.isArray(body.suggestions) ||
      !body.suggestions.every(
        (item) =>
          record(item) &&
          Number.isSafeInteger(item.id) &&
          item.id > 0 &&
          optionalText(item, [
            'posterUrl',
            'profileUrl',
            'knownForDepartment',
          ]) &&
          (!('releaseYear' in item) ||
            item.releaseYear === undefined ||
            (typeof item.releaseYear === 'number' &&
              Number.isSafeInteger(item.releaseYear))) &&
          (item.mediaType === 'movie'
            ? typeof item.title === 'string'
            : item.mediaType === 'person' && typeof item.name === 'string')
      ))
  ) {
    throw new ApiRequestError('invalid-response');
  }
  return body;
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
