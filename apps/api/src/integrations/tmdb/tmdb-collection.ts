import { NotFoundException } from '@nestjs/common';
import type { MovieCollectionResponse } from '@movie-explorer/contracts';

import { mapSearch, searchRecord, searchText } from './tmdb-search.mapper';
import { TmdbTransport } from './tmdb.transport';

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function collectionId(value: unknown): number | undefined {
  const id = record(value)?.id;

  return typeof id === 'number' && Number.isSafeInteger(id) && id > 0
    ? id
    : undefined;
}

export async function findMovieCollection(
  transport: TmdbTransport,
  imageBaseUrl: string,
  movieId: number,
): Promise<MovieCollectionResponse> {
  const movie = await transport.request({
    path: `/movie/${movieId}`,
    operation: 'movie-collection-reference',
    allowNotFound: true,
    validateBody: (value) => {
      const details = record(value);

      if (!details || details.id !== movieId) {
        throw new Error('Invalid movie identity');
      }
      if (
        details.belongs_to_collection != null &&
        !collectionId(details.belongs_to_collection)
      ) {
        throw new Error('Invalid collection reference');
      }
    },
  });

  if (movie === undefined) {
    throw new NotFoundException('Movie not found');
  }

  const reference = record(record(movie)?.belongs_to_collection);
  const id = collectionId(reference);

  if (id === undefined) {
    return { collection: null, results: [], availability: 'available' };
  }

  const body = await transport.request({
    path: `/collection/${id}`,
    operation: 'movie-collection',
    validateBody: (value) => {
      const collection = record(value);

      if (
        !collection ||
        collection.id !== id ||
        !Array.isArray(collection.parts)
      ) {
        throw new Error('Invalid collection');
      }
    },
  });

  return mapMovieCollection(
    body,
    id,
    movieId,
    imageBaseUrl,
    searchText(reference?.name),
  );
}

export function mapMovieCollection(
  value: unknown,
  id: number,
  movieId: number,
  imageBaseUrl: string,
  fallbackName?: string,
): MovieCollectionResponse {
  const collection = record(value);

  if (!collection || collection.id !== id || !Array.isArray(collection.parts)) {
    throw new Error('Invalid collection');
  }

  const movies = new Map<number, MovieCollectionResponse['results'][number]>();
  let partial = false;

  for (const part of collection.parts) {
    if (record(part)?.adult === true) {
      continue;
    }

    const result = mapSearch(
      { page: 1, total_pages: 1, total_results: 1, results: [part] },
      'movie',
      imageBaseUrl,
    ).results[0];

    if (!searchRecord(part) || result?.mediaType !== 'movie') {
      partial = true;
      continue;
    }
    if (result.id !== movieId && !movies.has(result.id)) {
      movies.set(result.id, result);
    }
  }

  const image = (path: unknown) => {
    const text = searchText(path);

    return text?.startsWith('/') ? `${imageBaseUrl}${text}` : undefined;
  };

  const results = [...movies.values()].sort((a, b) => {
    const date = (a.releaseDate ?? '9999-99-99').localeCompare(
      b.releaseDate ?? '9999-99-99',
    );

    return date || a.id - b.id;
  });

  return {
    collection: {
      id,
      name: searchText(collection.name) ?? fallbackName,
      posterUrl: image(collection.poster_path),
      backdropUrl: image(collection.backdrop_path),
    },
    results,
    availability: partial ? 'partial' : 'available',
  };
}
