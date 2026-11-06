import { GatewayTimeoutException, NotFoundException } from '@nestjs/common';
import type { MovieCollectionResponse } from '@movie-explorer/contracts';

import { localizationKey } from '../../localization';
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

const COLLECTION_TTL_MS = 30 * 60 * 1000;
const COLLECTION_CAPACITY = 100;
const REFERENCE_CAPACITY = 500;
const ENRICHMENT_BUDGET_MS = 3000;

type CollectionReference = { id: number; name?: string } | null;
type Cached<T> = { value: T; expiresAt: number };

function cacheValue<T>(
  cache: Map<string, Cached<T>>,
  id: string,
  value: T,
  capacity: number,
) {
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= Date.now()) {
      cache.delete(key);
    }
  }
  cache.delete(id);

  if (cache.size >= capacity) {
    cache.delete(cache.keys().next().value ?? id);
  }
  cache.set(id, { value, expiresAt: Date.now() + COLLECTION_TTL_MS });
}

// Locale and region form part of every cache and in-flight request identity.
export class TmdbCollections {
  private readonly references = new Map<string, Cached<CollectionReference>>();
  private readonly collections = new Map<
    string,
    Cached<MovieCollectionResponse>
  >();
  private readonly requests = new Map<
    string,
    Promise<MovieCollectionResponse>
  >();
  private readonly collectionRequests = new Map<
    string,
    Promise<MovieCollectionResponse>
  >();

  constructor(
    private readonly transport: TmdbTransport,
    private readonly imageBaseUrl: string,
  ) {}

  remember(movieId: number, value: unknown) {
    const id = collectionId(value);

    // Omitted/malformed optional detail metadata must not invalidate primary details
    // or suppress a later authoritative reference lookup.
    if (value !== null && id === undefined) {
      return;
    }

    const reference =
      id === undefined ? null : { id, name: searchText(record(value)?.name) };
    cacheValue(
      this.references,
      localizationKey(movieId),
      reference,
      REFERENCE_CAPACITY,
    );
  }

  find(movieId: number): Promise<MovieCollectionResponse> {
    const pending = this.requests.get(localizationKey(movieId));

    if (pending) {
      return pending;
    }

    const deadline = Date.now() + ENRICHMENT_BUDGET_MS;
    const request = this.load(movieId, deadline).finally(() =>
      this.requests.delete(localizationKey(movieId)),
    );
    this.requests.set(localizationKey(movieId), request);

    return request;
  }

  private remaining(deadline: number) {
    const remaining = deadline - Date.now();

    if (remaining <= 0) {
      throw new GatewayTimeoutException('Movie provider request timed out');
    }

    return remaining;
  }

  private async load(
    movieId: number,
    deadline: number,
  ): Promise<MovieCollectionResponse> {
    let reference = this.references.get(localizationKey(movieId));

    if (!reference || reference.expiresAt <= Date.now()) {
      await this.lookupReference(movieId, deadline);
      reference = this.references.get(localizationKey(movieId));
    }

    const memberOf = reference?.value;

    if (!memberOf) {
      return { collection: null, results: [], availability: 'available' };
    }

    const cached = this.collections.get(localizationKey(memberOf.id));
    let collection: MovieCollectionResponse;

    if (cached && cached.expiresAt > Date.now()) {
      collection = cached.value;
    } else {
      let pending = this.collectionRequests.get(localizationKey(memberOf.id));

      if (!pending) {
        pending = this.lookupCollection(memberOf.id, deadline).finally(() =>
          this.collectionRequests.delete(localizationKey(memberOf.id)),
        );
        this.collectionRequests.set(localizationKey(memberOf.id), pending);
      }

      // A shared collection request may belong to a caller with a later deadline.
      // Bound this wait too; do not abort a request still needed by another caller.
      let timer: ReturnType<typeof setTimeout> | undefined;

      try {
        collection = await Promise.race([
          pending,
          new Promise<never>((_resolve, reject) => {
            timer = setTimeout(
              () =>
                reject(
                  new GatewayTimeoutException(
                    'Movie provider request timed out',
                  ),
                ),
              this.remaining(deadline),
            );
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    }

    return {
      ...collection,
      collection: collection.collection && {
        ...collection.collection,
        name: collection.collection.name ?? memberOf.name,
      },
      results: collection.results.filter((movie) => movie.id !== movieId),
    };
  }

  private async lookupReference(movieId: number, deadline: number) {
    const movie = await this.transport.request({
      path: `/movie/${movieId}`,
      operation: 'movie-collection-reference',
      allowNotFound: true,
      timeoutMs: this.remaining(deadline),
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

    this.remember(movieId, record(movie)?.belongs_to_collection ?? null);
  }

  private async lookupCollection(id: number, deadline: number) {
    const body = await this.transport.request({
      path: `/collection/${id}`,
      operation: 'movie-collection',
      timeoutMs: this.remaining(deadline),
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

    // Cache all members so another movie in the same collection can reuse them.
    const result = mapMovieCollection(body, id, 0, this.imageBaseUrl);

    if (result.availability === 'available') {
      cacheValue(
        this.collections,
        localizationKey(id),
        result,
        COLLECTION_CAPACITY,
      );
    }

    return result;
  }
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
