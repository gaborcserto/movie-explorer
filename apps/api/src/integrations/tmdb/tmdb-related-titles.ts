import { BadGatewayException, NotFoundException } from '@nestjs/common';
import type {
  RecommendationTitle,
  RelatedTitleKind,
} from '@movie-explorer/contracts';

import type { RankedRecommendationPool } from '../../recommendations/recommendation-provider';
import type { TitleSignals } from '../../recommendations/title-ranking';
import { rankTitles } from '../../recommendations/title-ranking';
import { rankingSignals } from './tmdb-ranking-signals';
import { mapSearch, searchPage } from './tmdb-search.mapper';
import { TmdbTransport } from './tmdb.transport';

export async function findRelatedTitles(
  transport: TmdbTransport,
  imageBaseUrl: string,
  mediaType: 'movie' | 'tv',
  id: number,
  kind: RelatedTitleKind,
  timeoutMs?: number,
): Promise<RankedRecommendationPool> {
  const body = await transport.request({
    path: `/${mediaType}/${id}/${kind}`,
    operation: `${mediaType}-${kind}`,
    query: { page: '1' },
    allowNotFound: true,
    timeoutMs,
    validateBody: (value) => {
      if (searchPage(value).page !== 1) {
        throw new Error('Unexpected related titles page');
      }
    },
  });

  if (body === undefined) {
    throw new NotFoundException('Title not found');
  }

  const page = searchPage(body);
  const results = new Map<number, RecommendationTitle>();
  const signals = new Map<number, TitleSignals>();
  let malformed = false;
  let validCount = 0;

  for (const entry of page.results) {
    // Adult exclusions are intentional filtering, not a degraded response.
    if (
      entry &&
      typeof entry === 'object' &&
      'adult' in entry &&
      entry.adult === true
    ) {
      continue;
    }

    const mapped = mapSearch(
      {
        page: page.page,
        total_pages: page.total_pages,
        total_results: page.total_results,
        results: [entry],
      },
      mediaType,
      imageBaseUrl,
    ).results[0];

    if (!mapped || mapped.mediaType === 'person') {
      malformed = true;
      continue;
    }

    validCount += 1;

    if (mapped.id !== id && !results.has(mapped.id) && results.size < 20) {
      results.set(mapped.id, mapped);
      signals.set(mapped.id, rankingSignals(entry, mediaType));
    }
  }

  if (malformed && validCount === 0) {
    throw new BadGatewayException('Movie provider response was invalid');
  }

  return {
    results: [...results.values()],
    signals,
    availability: malformed ? 'partial' : 'available',
  };
}

/** Fixed-locale, instance-local source metadata; no candidate detail lookups. */
export class TmdbRelatedTitles {
  private readonly sources = new Map<
    string,
    { signals: TitleSignals; expiresAt: number }
  >();
  private readonly requests = new Map<string, Promise<TitleSignals>>();

  constructor(
    private readonly transport: TmdbTransport,
    private readonly imageBaseUrl: string,
  ) {}

  remember(mediaType: 'movie' | 'tv', id: number, body: unknown) {
    const now = Date.now();

    for (const [key, entry] of this.sources) {
      if (entry.expiresAt <= now) {
        this.sources.delete(key);
      }
    }

    const key = `${mediaType}:${id}`;
    this.sources.delete(key);

    if (this.sources.size >= 100) {
      this.sources.delete(this.sources.keys().next().value ?? key);
    }
    this.sources.set(key, {
      signals: rankingSignals(body, mediaType),
      expiresAt: now + 5 * 60 * 1000,
    });
  }

  async find(
    mediaType: 'movie' | 'tv',
    id: number,
    kind: RelatedTitleKind,
    timeoutMs?: number,
  ): Promise<RankedRecommendationPool> {
    const [related, source] = await Promise.allSettled([
      findRelatedTitles(
        this.transport,
        this.imageBaseUrl,
        mediaType,
        id,
        kind,
        timeoutMs,
      ),
      this.source(mediaType, id, Math.min(timeoutMs ?? 1500, 1500)),
    ]);

    if (related.status === 'rejected') {
      throw related.reason;
    }

    const sourceSignals =
      source.status === 'fulfilled' ? source.value : undefined;
    const pool = related.value;
    const ranked = rankTitles(
      sourceSignals ?? {},
      pool.results,
      pool.signals ?? new Map(),
    ).slice(0, 10);

    return {
      results: ranked.map(({ title }) => title),
      scores: new Map(ranked.map(({ title, score }) => [title.id, score])),
      signals: pool.signals,
      sourceSignals,
      availability:
        source.status === 'rejected' ? 'partial' : pool.availability,
    };
  }

  private source(
    mediaType: 'movie' | 'tv',
    id: number,
    timeoutMs: number,
  ): Promise<TitleSignals> {
    const key = `${mediaType}:${id}`;
    const cached = this.sources.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return Promise.resolve(cached.signals);
    }

    const pending = this.requests.get(key);

    if (pending) {
      return pending;
    }

    const request = this.transport
      .request({
        path: `/${mediaType}/${id}`,
        operation: `${mediaType}-ranking-source`,
        timeoutMs,
        validateBody: (value) => {
          if (
            !value ||
            typeof value !== 'object' ||
            !('id' in value) ||
            value.id !== id ||
            !('genres' in value) ||
            !Array.isArray(value.genres)
          ) {
            throw new Error('Invalid ranking source');
          }
        },
      })
      .then((body) => {
        this.remember(mediaType, id, body);

        return rankingSignals(body, mediaType);
      })
      .finally(() => this.requests.delete(key));
    this.requests.set(key, request);

    return request;
  }
}
