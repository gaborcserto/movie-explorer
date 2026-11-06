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
import { scoreTitle } from './title-ranking';
import type { TitleSignals } from './title-ranking';

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
      { title: RecommendationTitle; seeds: number; rank: number; score: number }
    >();
    const seedSignals: TitleSignals[] = [];

    const sources = await Promise.allSettled(
      [...new Set(favoriteIds)]
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

      if (source.value.sourceSignals) {
        seedSignals.push(source.value.sourceSignals);
      }

      const seen = new Set<number>();

      source.value.results.slice(0, 10).forEach((title, rank) => {
        if (!eligible(title) || seen.has(title.id)) {
          return;
        }

        seen.add(title.id);
        const existing = candidates.get(title.id);
        const score =
          source.value.scores?.get(title.id) ??
          scoreTitle(
            source.value.sourceSignals ?? {},
            source.value.signals?.get(title.id) ?? { rating: title.rating },
            rank,
          );

        if (existing) {
          existing.seeds += 1;
          existing.rank += rank;
          existing.score += score;
        } else {
          candidates.set(title.id, { title, seeds: 1, rank, score });
        }
      });
    }

    // Multiple independent seeds add support without overriding large relevance gaps.
    const results = [...candidates.values()]
      .sort(
        (a, b) =>
          b.score / b.seeds +
            0.12 * (b.seeds - 1) -
            (a.score / a.seeds + 0.12 * (a.seeds - 1)) ||
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
        const rankedFallback = fallback
          .map((title, rank) => {
            const signals = pool.signals?.get(title.id) ?? {
              rating: title.rating,
            };
            const profiles = seedSignals.length ? seedSignals : [{}];
            const score =
              profiles.reduce(
                (sum, source) => sum + scoreTitle(source, signals, rank),
                0,
              ) / profiles.length;

            return { title, rank, score };
          })
          .sort(
            (a, b) =>
              b.score - a.score || a.rank - b.rank || a.title.id - b.title.id,
          );
        results.push(
          ...rankedFallback
            .slice(0, 10 - results.length)
            .map(({ title }) => title),
        );
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
