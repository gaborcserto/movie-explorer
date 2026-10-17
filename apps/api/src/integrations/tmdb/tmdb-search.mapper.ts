import { BadGatewayException } from '@nestjs/common';
import type {
  PersonListResponse,
  PersonSummary,
} from '@movie-explorer/contracts';

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
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return undefined;
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
    )
      continue;
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
