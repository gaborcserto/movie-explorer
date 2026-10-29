import type {
  CombinedFilmography,
  FilmographyMediaType,
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
  SearchResponse,
  SearchType,
  SeriesDetails,
  SeriesCredits,
  SeriesImages,
  SeriesVideos,
  SeasonDetails,
  EpisodeDetails,
  EpisodeCredits,
  WatchProviders,
  Ratings,
  DiscoverySection,
  StreamingProviderInfo,
} from '@movie-explorer/contracts';

import type { URLParams } from '../types';
import {
  record,
  availability,
  availabilityMap,
  movieSection,
  filmography,
  optionalText,
} from './partialValidation';
import {
  seriesDetails,
  seriesCredits,
  seriesImages,
  seriesVideos,
  seasonDetails,
  episodeDetails,
  episodeCredits,
} from './seriesValidation';
import combinedFilmography from './filmographyValidation';
import { searchResponse, searchResult } from './searchValidation';
import request from './apiTransport';
import { ApiRequestError } from './apiErrors';

export { ApiRequestError };

export {
  API_REQUEST_TIMEOUT_MS,
  classifyHttpStatus,
  isNotFoundError,
} from './apiErrors';
export type { ApiErrorCategory } from './apiErrors';

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const apiBaseUrl = (configuredApiBaseUrl ?? 'http://localhost:4000').replace(
  /\/+$/,
  ''
);
const moviesUrl = `${apiBaseUrl}/api/v1/movies`;

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

  return {
    ...body,
    credits: seriesCredits(body.credits) ? body.credits : undefined,
    images: seriesImages(body.images) ? body.images : undefined,
    videos: seriesVideos(body.videos) ? body.videos : undefined,
  };
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
        } else {
          body[section] = [];
        }
      }
    });
  }

  return body;
};

function watchProvidersResponse(value: unknown): value is WatchProviders {
  return (
    record(value) &&
    Array.isArray(value.providers) &&
    value.providers.every((item: unknown) => {
      if (!record(item)) {
        return false;
      }

      return (
        Number.isSafeInteger(item.id) &&
        typeof item.id === 'number' &&
        item.id > 0 &&
        typeof item.name === 'string' &&
        item.name.trim().length > 0 &&
        ['streaming', 'rent', 'buy'].includes(String(item.category)) &&
        item.region === 'HU' &&
        (item.logoUrl === undefined || typeof item.logoUrl === 'string') &&
        (item.watchUrl === undefined || typeof item.watchUrl === 'string')
      );
    })
  );
}

export async function getWatchProviders(
  kind: 'movies' | 'series',
  id: number,
  signal: AbortSignal
): Promise<WatchProviders> {
  const body = await request<unknown>(
    `${apiBaseUrl}/api/v1/${kind}/${id}/watch-providers`,
    { signal }
  );

  if (!watchProvidersResponse(body)) {
    throw new ApiRequestError('invalid-response');
  }

  return body;
}

export const getPerson = async (
  id: number,
  signal?: AbortSignal,
  includeCombined = false
): Promise<PersonDetails> => {
  const body = await request<PersonDetails>(
    `${apiBaseUrl}/api/v1/persons/${id}${includeCombined ? '?include=combinedFilmography' : ''}`,
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
  if (
    body.combinedFilmography !== undefined &&
    !combinedFilmography(body.combinedFilmography)
  ) {
    body.combinedFilmography = {
      entries: [],
      groups: {
        movie: { status: 'unavailable' },
        tv: { status: 'unavailable' },
      },
    };
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

export function sortOrderParams(
  data: string | undefined | null,
  sort: MovieSortField
): MovieSortOrder;
export function sortOrderParams(
  data: string | undefined | null,
  sort: undefined
): undefined;
export function sortOrderParams(
  data: string | undefined | null,
  sort: MovieSortField | undefined
): MovieSortOrder | undefined;
export function sortOrderParams(
  data: string | undefined | null,
  sort: MovieSortField | undefined
): MovieSortOrder | undefined {
  if (!sort) {
    return undefined;
  }
  if (data === 'asc' || data === 'desc') {
    return data;
  }

  return defaultSortOrder(sort);
}

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

  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (key === 'genre' && Array.isArray(value)) {
      value.forEach((genre) => query.append(key, genre));

      return;
    }

    query.set(key, String(value));
  });

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
  const params = new URLSearchParams({
    query,
    limit: '6',
    includeSeries: 'true',
  });
  const body = await request<SearchSuggestionsResponse>(
    `${apiBaseUrl}/api/v1/search/suggestions?${params}`,
    signal ? { signal } : {}
  );

  if (!record(body)) {
    throw new ApiRequestError('invalid-response');
  }
  if (
    (body.groups !== undefined &&
      (!availabilityMap(body.groups, ['movie', 'person']) ||
        (body.groups.tv !== undefined && !availability(body.groups.tv)))) ||
    !Array.isArray(body.suggestions) ||
    !body.suggestions.every(searchResult)
  ) {
    throw new ApiRequestError('invalid-response');
  }

  return body;
};

export async function getSearchResults(
  query: string,
  type: SearchType,
  page: number,
  signal?: AbortSignal,
  year?: string
): Promise<SearchResponse> {
  const params = new URLSearchParams({ query, type, page: String(page) });

  if (year) {
    params.set('year', year);
  }
  const body = await request<unknown>(`${apiBaseUrl}/api/v1/search?${params}`, {
    signal,
  });

  if (
    !searchResponse(body) ||
    body.page !== page ||
    body.results.some((item) => type !== 'all' && item.mediaType !== type)
  ) {
    throw new ApiRequestError('invalid-response');
  }

  return body;
}

export async function getDiscoverySection(
  section: DiscoverySection,
  signal?: AbortSignal,
  page = 1
): Promise<SearchResponse> {
  const params = new URLSearchParams({ page: String(page) });
  const body = await request<unknown>(
    `${apiBaseUrl}/api/v1/discover/${section}?${params}`,
    signal ? { signal } : {}
  );

  if (!searchResponse(body) || body.page !== page) {
    throw new ApiRequestError('invalid-response');
  }

  return body;
}

export async function getStreamingProviders(
  region: string,
  signal?: AbortSignal
): Promise<StreamingProviderInfo[]> {
  const params = new URLSearchParams({ region });
  const body = await request<unknown>(
    `${apiBaseUrl}/api/v1/discover/providers?${params}`,
    signal ? { signal } : {}
  );

  if (
    !Array.isArray(body) ||
    !body.every(
      (provider) =>
        record(provider) &&
        Number.isSafeInteger(provider.id) &&
        typeof provider.id === 'number' &&
        provider.id > 0 &&
        typeof provider.name === 'string' &&
        provider.name.trim().length > 0
    )
  ) {
    throw new ApiRequestError('invalid-response');
  }

  return body;
}

export async function getStreamingProviderSection(
  providerId: number,
  region: string,
  page: number,
  signal?: AbortSignal
): Promise<SearchResponse> {
  const params = new URLSearchParams({ region, page: String(page) });
  const body = await request<unknown>(
    `${apiBaseUrl}/api/v1/discover/streaming/${providerId}?${params}`,
    signal ? { signal } : {}
  );

  if (!searchResponse(body) || body.page !== page) {
    throw new ApiRequestError('invalid-response');
  }

  return body;
}

export async function getPopularSeries(
  page: number,
  filters: { year?: string; rating?: string; sorting?: string; order?: string },
  signal?: AbortSignal
): Promise<SearchResponse> {
  const params = new URLSearchParams({ page: String(page) });

  if (filters.year) {
    params.set('year', filters.year);
  }
  if (filters.rating) {
    params.set('minimumRating', filters.rating);
  }
  if (filters.sorting) {
    params.set(
      'sort',
      filters.sorting === 'releaseDate' ? 'firstAirDate' : filters.sorting
    );
  }
  if (filters.order) {
    params.set('order', filters.order);
  }
  const body = await request<unknown>(`${apiBaseUrl}/api/v1/series?${params}`, {
    signal,
  });

  if (
    !searchResponse(body) ||
    body.page !== page ||
    body.results.some((item) => item.mediaType !== 'tv')
  ) {
    throw new ApiRequestError('invalid-response');
  }

  return body;
}

export const getPeople = (
  query: string,
  page = 1,
  signal?: AbortSignal
): Promise<PersonListResponse> => {
  const params = new URLSearchParams();

  if (query) {
    params.set('query', query);
  }
  params.set('page', String(page));

  return request<PersonListResponse>(
    `${apiBaseUrl}/api/v1/persons?${params}`,
    signal ? { signal } : {}
  );
};

export async function getSeriesCredits(
  id: number,
  signal?: AbortSignal
): Promise<SeriesCredits> {
  const body: unknown = await request(
    `${apiBaseUrl}/api/v1/series/${id}/credits`,
    signal ? { signal } : {}
  );

  if (!seriesCredits(body)) {
    throw new ApiRequestError('invalid-response');
  }

  return body;
}

export async function getSeriesImages(
  id: number,
  signal?: AbortSignal
): Promise<SeriesImages> {
  const body: unknown = await request(
    `${apiBaseUrl}/api/v1/series/${id}/images`,
    signal ? { signal } : {}
  );

  if (!seriesImages(body)) {
    throw new ApiRequestError('invalid-response');
  }

  return body;
}

export async function getSeriesVideos(
  id: number,
  signal?: AbortSignal
): Promise<SeriesVideos> {
  const body: unknown = await request(
    `${apiBaseUrl}/api/v1/series/${id}/videos`,
    signal ? { signal } : {}
  );

  if (!seriesVideos(body)) {
    throw new ApiRequestError('invalid-response');
  }

  return body;
}

export async function getCombinedFilmography(
  id: number,
  mediaType: FilmographyMediaType,
  signal: AbortSignal
): Promise<CombinedFilmography> {
  const body: unknown = await request(
    `${apiBaseUrl}/api/v1/persons/${id}/combined-filmography?mediaType=${mediaType}`,
    { signal }
  );

  if (!combinedFilmography(body, mediaType)) {
    throw new ApiRequestError('invalid-response');
  }

  return body;
}

function ratingResult(value: unknown): value is Ratings['tmdb'] {
  if (!record(value)) {
    return false;
  }

  if (value.status === 'missing') {
    return true;
  }

  if (value.status === 'available') {
    return (
      typeof value.score === 'number' &&
      Number.isFinite(value.score) &&
      value.score >= 0 &&
      value.score <= 10 &&
      (value.voteCount === null ||
        (typeof value.voteCount === 'number' &&
          Number.isSafeInteger(value.voteCount) &&
          value.voteCount >= 0))
    );
  }

  return (
    value.status === 'unavailable' &&
    [
      'timeout',
      'upstream-error',
      'invalid-response',
      'not-configured',
    ].includes(String(value.reason)) &&
    (value.retryAfterSeconds === undefined ||
      (Number.isSafeInteger(value.retryAfterSeconds) &&
        Number(value.retryAfterSeconds) > 0))
  );
}

export async function getRatings(
  kind: 'movie' | 'series',
  id: number,
  signal: AbortSignal
): Promise<Ratings> {
  const body = await request<unknown>(
    `${apiBaseUrl}/api/v1/${kind === 'movie' ? 'movies' : 'series'}/${id}/ratings`,
    { signal }
  );

  if (!record(body) || !ratingResult(body.tmdb) || !ratingResult(body.imdb)) {
    throw new ApiRequestError('invalid-response');
  }

  return { tmdb: body.tmdb, imdb: body.imdb };
}
