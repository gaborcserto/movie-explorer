import { BadGatewayException } from '@nestjs/common';
import type {
  RecommendationCategory,
  RecommendationTitle,
} from '@movie-explorer/contracts';

import type { RecommendationPool } from '../../recommendations/recommendation-provider';
import type { TmdbConfig } from './tmdb.config';
import { mapSearch, searchPage } from './tmdb-search.mapper';
import { TmdbTransport } from './tmdb.transport';

const POOL_TTL_MS = 30 * 60 * 1000;
const POOL_CAPACITY = 4;
const routes: Record<
  RecommendationCategory,
  { path: string; mediaType: 'movie' | 'tv' }
> = {
  'popular-movies': { path: '/movie/popular', mediaType: 'movie' },
  'top-rated-movies': { path: '/movie/top_rated', mediaType: 'movie' },
  'popular-series': { path: '/tv/popular', mediaType: 'tv' },
  'top-rated-series': { path: '/tv/top_rated', mediaType: 'tv' },
};

/** Instance-local, fixed-locale pools shared by warm requests, including waiters. */
export class TmdbRecommendationPools {
  private readonly cache = new Map<
    string,
    { pool: RecommendationPool; expiresAt: number }
  >();
  private readonly requests = new Map<string, Promise<RecommendationPool>>();

  constructor(
    private readonly transport: TmdbTransport,
    private readonly config: TmdbConfig,
  ) {}

  async find(category: RecommendationCategory): Promise<RecommendationPool> {
    this.prune();
    const key = JSON.stringify([
      category,
      this.config.language,
      this.config.region ?? null,
    ]);
    const cached = this.cache.get(key);

    if (cached) {
      return cached.pool;
    }

    const pending = this.requests.get(key);

    if (pending) {
      return pending;
    }

    const request = this.load(category);
    this.requests.set(key, request);

    try {
      const pool = await request;

      // Partial data must not hide an upstream outage for the full pool TTL.
      if (pool.availability === 'available') {
        this.cache.set(key, { pool, expiresAt: Date.now() + POOL_TTL_MS });
        this.prune();
      }

      return pool;
    } finally {
      this.requests.delete(key);
    }
  }

  private prune() {
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }

    while (this.cache.size > POOL_CAPACITY) {
      const oldest = this.cache.keys().next().value;

      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }
  }

  private async load(
    category: RecommendationCategory,
  ): Promise<RecommendationPool> {
    const first = await this.fetchPage(category, 1);
    const pageCount = Math.min(5, first.totalPages);
    const pages = await Promise.allSettled(
      Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
        this.fetchPage(category, index + 2),
      ),
    );
    const candidates = new Map<string, RecommendationTitle>();
    const responses = [
      first,
      ...pages.flatMap((page) =>
        page.status === 'fulfilled' ? [page.value] : [],
      ),
    ];

    // allSettled retains page order even when upstream completion order differs.
    for (const response of responses) {
      for (const title of response.results) {
        const key = `${title.mediaType}:${title.id}`;

        if (
          title.mediaType !== 'person' &&
          !candidates.has(key) &&
          candidates.size < 100
        ) {
          candidates.set(key, title);
        }
      }
    }

    const failure = pages.find((page) => page.status === 'rejected');

    if (failure && candidates.size === 0) {
      throw failure.reason;
    }

    return {
      results: [...candidates.values()],
      availability: failure ? 'partial' : 'available',
    };
  }

  private async fetchPage(category: RecommendationCategory, page: number) {
    const route = routes[category];
    const body = await this.transport.request({
      path: route.path,
      operation: `recommendations-${category}`,
      query: { page: String(page) },
      validateBody: (value) => {
        const parsed = searchPage(value);

        if (
          parsed.page !== page ||
          (parsed.total_pages === 0 && parsed.results.length > 0)
        ) {
          throw new BadGatewayException(
            'Recommendation provider response was invalid',
          );
        }
      },
    });

    return mapSearch(body, route.mediaType, this.config.imageBaseUrl);
  }
}
