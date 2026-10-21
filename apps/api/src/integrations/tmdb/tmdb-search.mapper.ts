import { BadGatewayException } from '@nestjs/common';
import type {
  PersonListResponse,
  PersonSummary,
  SearchResponse,
  SearchResult,
  SearchType,
} from '@movie-explorer/contracts';

import { seriesDate } from './tmdb-series.validation';

export function searchPage(value: unknown): {
  results: unknown[];
  page: number;
  total_pages: number;
  total_results: number;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    !('results' in value) ||
    !Array.isArray(value.results) ||
    !('page' in value) ||
    !Number.isInteger(value.page) ||
    Number(value.page) < 1 ||
    !('total_pages' in value) ||
    !Number.isInteger(value.total_pages) ||
    Number(value.total_pages) < 0 ||
    !('total_results' in value) ||
    !Number.isInteger(value.total_results) ||
    Number(value.total_results) < 0
  ) {
    throw new BadGatewayException('Search provider response was invalid');
  }
  return {
    results: value.results,
    page: Number(value.page),
    total_pages: Number(value.total_pages),
    total_results: Number(value.total_results),
  };
}

export function searchRecord(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  return typeof record.id === 'number' &&
    Number.isSafeInteger(record.id) &&
    record.id > 0 &&
    record.adult !== true
    ? record
    : undefined;
}

export function searchText(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

export function mapPeople(
  value: unknown,
  imageBaseUrl: string,
): PersonListResponse {
  const response = searchPage(value);
  const people = new Map<number, PersonSummary>();
  for (const item of response.results) {
    const record = searchRecord(item);
    const name = searchText(record?.name);
    if (
      !record ||
      !name ||
      (record.media_type && record.media_type !== 'person')
    ) {
      continue;
    }

    const path = searchText(record.profile_path);
    people.set(Number(record.id), {
      id: Number(record.id),
      name,
      ...(path?.startsWith('/') && { profileUrl: `${imageBaseUrl}${path}` }),
      ...(searchText(record.known_for_department) && {
        knownForDepartment: searchText(record.known_for_department),
      }),
    });
  }
  return {
    people: [...people.values()],
    page: response.page,
    totalPages: Math.min(response.total_pages, 500),
    totalResults: response.total_results,
  };
}

export function mapSearch(
  value: unknown,
  type: SearchType,
  imageBaseUrl: string,
): SearchResponse {
  const response = searchPage(value);
  const results = new Map<string, SearchResult>();
  for (const entry of response.results) {
    const item = searchRecord(entry);
    if (!item) continue;
    const mediaType = type === 'all' ? item.media_type : type;
    if (item.media_type && item.media_type !== mediaType) continue;
    const title = searchText(mediaType === 'movie' ? item.title : item.name);
    if (!title) continue;
    const id = Number(item.id);
    const path = searchText(
      mediaType === 'person' ? item.profile_path : item.poster_path,
    );
    const image = path?.startsWith('/') ? `${imageBaseUrl}${path}` : undefined;
    const popularity =
      typeof item.popularity === 'number' &&
      Number.isFinite(item.popularity) &&
      item.popularity >= 0
        ? item.popularity
        : undefined;
    let result: SearchResult;
    if (mediaType === 'person') {
      result = {
        id,
        mediaType,
        name: title,
        profileUrl: image,
        knownForDepartment: searchText(item.known_for_department),
        popularity,
      };
    } else if (mediaType === 'movie' || mediaType === 'tv') {
      const rawDate = searchText(
        mediaType === 'movie' ? item.release_date : item.first_air_date,
      );
      const date = seriesDate(rawDate) ?? undefined;
      const metadata = {
        id,
        title,
        posterUrl: image,
        description: searchText(item.overview),
        popularity,
        rating:
          typeof item.vote_average === 'number' &&
          Number.isFinite(item.vote_average) &&
          item.vote_average >= 0 &&
          item.vote_average <= 10
            ? item.vote_average
            : undefined,
      };
      result =
        mediaType === 'movie'
          ? {
              ...metadata,
              mediaType,
              releaseDate: date,
              releaseYear: date ? Number(date.slice(0, 4)) : undefined,
            }
          : { ...metadata, mediaType, firstAirDate: date };
    } else continue;
    const key = `${mediaType}:${id}`;
    if (!results.has(key)) results.set(key, result);
  }
  return {
    results: [...results.values()],
    page: response.page,
    totalPages: Math.min(response.total_pages, 500),
    totalResults: response.total_results,
  };
}
