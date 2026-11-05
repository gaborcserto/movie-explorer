import { Inject, Injectable } from '@nestjs/common';
import type {
  RecommendationCategory,
  RecommendationResponse,
  PersonalizedRecommendationRequest,
  PersonalizedRecommendationResponse,
  RecommendationTitle,
} from '@movie-explorer/contracts';

import { DISCOVERY_PROVIDER } from '../discovery/discovery.tokens';
import type { RecommendationProvider } from './recommendation-provider';
import { sampleTitles } from './sample-titles';

@Injectable()
export class RecommendationsService {
  constructor(
    @Inject(DISCOVERY_PROVIDER)
    private readonly provider: RecommendationProvider,
  ) {}

  async find(
    category: RecommendationCategory,
  ): Promise<RecommendationResponse> {
    const pool = await this.provider.findRecommendationPool(category);

    return {
      category,
      results: sampleTitles(pool.results),
      availability: pool.availability,
      candidateCount: pool.results.length,
    };
  }

  async personalize(
    preferences: PersonalizedRecommendationRequest,
  ): Promise<PersonalizedRecommendationResponse> {
    const { mediaType, favoriteIds, excludedIds } = preferences;
    const excluded = new Set([...favoriteIds, ...excludedIds]);
    const candidates = new Map<
      number,
      { title: RecommendationTitle; seeds: number; rank: number }
    >();

    const sources = await Promise.allSettled(
      [...favoriteIds]
        .sort((a, b) => a - b)
        .slice(0, 3)
        .map((id) => this.provider.findFavoriteSimilar(mediaType, id)),
    );

    let partial = false;
    let failure: unknown;

    const eligible = (title: RecommendationTitle) =>
      title.mediaType === mediaType &&
      Number.isSafeInteger(title.id) &&
      title.id > 0 &&
      Boolean(title.title.trim()) &&
      Boolean(title.posterUrl?.trim()) &&
      !excluded.has(title.id);

    for (const source of sources) {
      if (source.status === 'rejected') {
        partial = true;
        failure ??= source.reason;
        continue;
      }

      partial ||= source.value.availability === 'partial';

      const seen = new Set<number>();

      source.value.results.slice(0, 10).forEach((title, rank) => {
        if (!eligible(title) || seen.has(title.id)) {
          return;
        }

        seen.add(title.id);
        const existing = candidates.get(title.id);

        if (existing) {
          existing.seeds += 1;
          existing.rank += rank;
        } else {
          candidates.set(title.id, { title, seeds: 1, rank });
        }
      });
    }

    // Average source rank treats all seeds equally; IDs settle exact ties.
    const results = [...candidates.values()]
      .sort(
        (a, b) =>
          b.seeds - a.seeds ||
          a.rank / a.seeds - b.rank / b.seeds ||
          a.title.id - b.title.id,
      )
      .slice(0, 10)
      .map((candidate) => candidate.title);
    const personalizedCount = results.length;

    if (results.length < 10) {
      try {
        const pool = await this.provider.findRecommendationPool(
          mediaType === 'movie' ? 'popular-movies' : 'popular-series',
        );
        partial ||= pool.availability === 'partial';

        const seen = new Set(results.map((title) => title.id));
        const fallback = pool.results.filter((title) => {
          if (!eligible(title) || seen.has(title.id)) {
            return false;
          }

          seen.add(title.id);

          return true;
        });
        results.push(...sampleTitles(fallback).slice(0, 10 - results.length));
      } catch (error: unknown) {
        partial = true;
        failure ??= error;
      }
    }

    if (!results.length && failure) {
      throw failure;
    }

    return {
      mediaType,
      results,
      availability: partial ? 'partial' : 'available',
      source:
        personalizedCount === 0
          ? 'popular'
          : results.length > personalizedCount
            ? 'mixed'
            : 'favorites',
    };
  }
}
