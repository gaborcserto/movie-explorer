import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type {
  DiscoverySection,
  SearchResponse,
  SearchResult,
  StreamingProviderInfo,
} from '@movie-explorer/contracts';

import { getTmdbConfig, TmdbConfig } from './tmdb.config';
import { TmdbTransport } from './tmdb.transport';
import { mapSearch, searchPage } from './tmdb-search.mapper';

const CACHE_TTL_MS = 5 * 60 * 1000;
const SEARCH_CACHE_CAPACITY = 100;
const PROVIDER_CACHE_CAPACITY = 32;

// Opportunistic expiry and FIFO eviction bound retention without background timers.
function pruneCache<T extends { expiresAt: number }>(
  cache: Map<string, T>,
  capacity: number,
) {
  const now = Date.now();

  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }

  while (cache.size > capacity) {
    const oldest = cache.keys().next().value;

    if (oldest !== undefined) {
      cache.delete(oldest);
    }
  }
}

@Injectable()
export class TmdbDiscoveryProvider {
  private readonly transport: TmdbTransport;
  private readonly cache = new Map<
    string,
    { expiresAt: number; response: SearchResponse }
  >();
  private readonly requests = new Map<string, Promise<SearchResponse>>();
  private readonly providerCache = new Map<
    string,
    { expiresAt: number; providers: StreamingProviderInfo[] }
  >();
  private readonly providerRequests = new Map<
    string,
    Promise<StreamingProviderInfo[]>
  >();

  constructor(private readonly config: TmdbConfig = getTmdbConfig()) {
    this.transport = new TmdbTransport(
      config,
      new Logger(TmdbDiscoveryProvider.name),
    );
  }

  async find(section: DiscoverySection, page = 1): Promise<SearchResponse> {
    return this.cachedSearch(`${section}:${page}`, () =>
      this.load(section, page),
    );
  }

  async findStreamingProviders(
    region: string,
  ): Promise<StreamingProviderInfo[]> {
    pruneCache(this.providerCache, PROVIDER_CACHE_CAPACITY);
    const cached = this.providerCache.get(region);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.providers;
    }

    const pending = this.providerRequests.get(region);

    if (pending) {
      return pending;
    }

    const request = this.loadStreamingProviders(region);
    this.providerRequests.set(region, request);

    try {
      const providers = await request;
      this.providerCache.set(region, {
        providers,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      pruneCache(this.providerCache, PROVIDER_CACHE_CAPACITY);

      return providers;
    } finally {
      this.providerRequests.delete(region);
    }
  }

  async findStreaming(
    providerId: number,
    region: string,
    page: number,
  ): Promise<SearchResponse> {
    const providers = await this.findStreamingProviders(region);

    if (!providers.some((provider) => provider.id === providerId)) {
      throw new BadRequestException('Streaming provider is not available');
    }

    return this.cachedSearch(
      `streaming:${region}:${providerId}:${page}`,
      async () => {
        const query = {
          watch_region: region,
          with_watch_providers: String(providerId),
          with_watch_monetization_types: 'flatrate',
          sort_by: 'popularity.desc',
        };
        const [movies, series] = await Promise.all([
          this.fetchPage(
            '/discover/movie',
            'movie',
            query,
            'streaming-movies',
            page,
          ),
          this.fetchPage('/discover/tv', 'tv', query, 'streaming-series', page),
        ]);
        const results = new Map<string, SearchResult>();

        [...movies.results, ...series.results].forEach((result) => {
          results.set(`${result.mediaType}:${result.id}`, result);
        });

        return {
          results: [...results.values()],
          page,
          totalPages: Math.max(movies.totalPages, series.totalPages),
          totalResults: movies.totalResults + series.totalResults,
        };
      },
    );
  }

  private async cachedSearch(
    key: string,
    load: () => Promise<SearchResponse>,
  ): Promise<SearchResponse> {
    pruneCache(this.cache, SEARCH_CACHE_CAPACITY);
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.response;
    }

    const pending = this.requests.get(key);

    if (pending) {
      return pending;
    }

    const request = load();
    this.requests.set(key, request);

    try {
      const response = await request;
      this.cache.set(key, {
        response,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      pruneCache(this.cache, SEARCH_CACHE_CAPACITY);

      return response;
    } finally {
      this.requests.delete(key);
    }
  }

  private async loadStreamingProviders(
    region: string,
  ): Promise<StreamingProviderInfo[]> {
    const [movies, series] = await Promise.all([
      this.transport.request({
        path: '/watch/providers/movie',
        operation: 'discover-streaming-providers-movies',
        query: { watch_region: region },
        validateBody: validateProviderCatalog,
      }),
      this.transport.request({
        path: '/watch/providers/tv',
        operation: 'discover-streaming-providers-series',
        query: { watch_region: region },
        validateBody: validateProviderCatalog,
      }),
    ]);
    const providersById = new Map<number, StreamingProviderInfo>();

    [
      ...providerCatalogResults(movies),
      ...providerCatalogResults(series),
    ].forEach((provider) => providersById.set(provider.id, provider));

    return [...providersById.values()].sort((first, second) =>
      first.name.localeCompare(second.name),
    );
  }

  private async load(
    section: DiscoverySection,
    page: number,
  ): Promise<SearchResponse> {
    const today = new Date().toISOString().slice(0, 10);
    const daysAgo = (days: number) => {
      const date = new Date(`${today}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() - days);

      return date.toISOString().slice(0, 10);
    };

    if (section === 'coming-soon') {
      const [movies, series] = await Promise.all([
        this.fetchPage(
          '/discover/movie',
          'movie',
          {
            region: 'HU',
            'primary_release_date.gte': today,
            'primary_release_date.lte': daysAhead(90),
            sort_by: 'primary_release_date.asc',
          },
          section,
          page,
        ),
        this.fetchPage(
          '/discover/tv',
          'tv',
          {
            'first_air_date.gte': today,
            'first_air_date.lte': daysAhead(90),
            sort_by: 'first_air_date.asc',
          },
          section,
          page,
        ),
      ]);
      const results = [...movies.results, ...series.results].sort(
        (left, right) => {
          const leftDate = discoveryDate(left);
          const rightDate = discoveryDate(right);

          return (leftDate ?? '').localeCompare(rightDate ?? '');
        },
      );

      return {
        results,
        page,
        totalPages: Math.max(movies.totalPages, series.totalPages),
        totalResults: movies.totalResults + series.totalResults,
      };
    }

    const routes: Record<
      DiscoverySection,
      {
        path: string;
        mediaType: 'all' | 'movie' | 'tv';
        query?: Record<string, string>;
      }
    > = {
      trending: { path: '/trending/all/week', mediaType: 'all' },
      'new-movies': {
        path: '/discover/movie',
        mediaType: 'movie',
        query: {
          region: 'HU',
          'release_date.gte': daysAgo(30),
          'release_date.lte': today,
          with_release_type: '2|3',
          sort_by: 'release_date.desc',
        },
      },
      'new-series': {
        path: '/discover/tv',
        mediaType: 'tv',
        query: {
          'first_air_date.gte': daysAgo(60),
          'first_air_date.lte': today,
          sort_by: 'first_air_date.desc',
        },
      },
      'popular-movies': { path: '/movie/popular', mediaType: 'movie' },
      'popular-series': { path: '/tv/popular', mediaType: 'tv' },
      cinema: {
        path: '/movie/now_playing',
        mediaType: 'movie',
        query: { region: 'HU' },
      },
      'coming-soon': { path: '/discover/movie', mediaType: 'movie' },
      'streaming-movies': {
        path: '/discover/movie',
        mediaType: 'movie',
        query: {
          watch_region: 'HU',
          with_watch_monetization_types: 'flatrate',
          sort_by: 'popularity.desc',
        },
      },
      'streaming-series': {
        path: '/discover/tv',
        mediaType: 'tv',
        query: {
          watch_region: 'HU',
          with_watch_monetization_types: 'flatrate',
          sort_by: 'popularity.desc',
        },
      },
    };
    const route = routes[section];

    return this.fetchPage(
      route.path,
      route.mediaType,
      route.query,
      section,
      page,
    );
  }

  private async fetchPage(
    path: string,
    mediaType: 'all' | 'movie' | 'tv',
    query: Record<string, string> = {},
    section: DiscoverySection,
    page: number,
  ): Promise<SearchResponse> {
    const body = await this.transport.request({
      path,
      operation: `discover-${section}`,
      query: { ...query, page: String(page) },
      validateBody: (value) => {
        if (searchPage(value).page !== page) {
          throw new BadGatewayException(
            'Discovery provider response was invalid',
          );
        }
      },
    });

    return mapSearch(body, mediaType, this.config.imageBaseUrl);
  }
}

function validateProviderCatalog(value: unknown): void {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !Array.isArray((value as Record<string, unknown>).results)
  ) {
    throw new BadGatewayException('Streaming provider response was invalid');
  }
}

function providerCatalogResults(value: unknown): StreamingProviderInfo[] {
  const results = (value as { results: unknown[] }).results;

  return results.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return [];
    }

    const provider = entry as Record<string, unknown>;

    if (
      !Number.isSafeInteger(provider.provider_id) ||
      typeof provider.provider_id !== 'number' ||
      provider.provider_id < 1 ||
      typeof provider.provider_name !== 'string' ||
      !provider.provider_name.trim()
    ) {
      return [];
    }

    return [{ id: provider.provider_id, name: provider.provider_name.trim() }];
  });
}

function discoveryDate(item: SearchResult): string | undefined {
  if (item.mediaType === 'movie') {
    return item.releaseDate;
  }
  if (item.mediaType === 'tv') {
    return item.firstAirDate;
  }

  return undefined;
}

function daysAhead(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}
