import { Inject, Injectable, Optional } from '@nestjs/common';
import type {
  RelatedTitleKind,
  RelatedTitlesResponse,
  RecommendationTitle,
  MovieDetails,
  WatchProviders,
  MovieListResponse,
  MovieQueryParams,
  MovieSection,
  Ratings,
  MovieSuggestionsResponse,
} from '@movie-explorer/contracts';

import { MOVIE_PROVIDER, MovieProvider } from './movie-provider';
import { RatingsService } from '../ratings/ratings.service';
import { ratingFailureReason } from '../ratings/rating-failure-reason';

@Injectable()
export class MoviesService {
  constructor(
    @Inject(MOVIE_PROVIDER)
    private readonly movieProvider: MovieProvider,
    @Optional() private readonly ratings?: RatingsService,
  ) {}

  async findRelated(
    id: number,
    kind: RelatedTitleKind,
  ): Promise<RelatedTitlesResponse> {
    if (kind !== 'similar') {
      const { results, availability } = await this.movieProvider.findRelated(
        id,
        kind,
      );

      return { results, availability };
    }

    const [collection, recommended, similar] = await Promise.allSettled([
      this.movieProvider.findCollection(id),
      this.movieProvider.findRelated(id, 'recommendations'),
      this.movieProvider.findRelated(id, 'similar'),
    ]);

    const results = new Map<number, RecommendationTitle>();
    const sources = [collection, recommended, similar];
    const scores = new Map<number, number>();

    for (const [index, source] of [recommended, similar].entries()) {
      if (source.status === 'fulfilled') {
        source.value.results.forEach((title, rank) => {
          const score =
            (source.value.scores?.get(title.id) ?? 0.3 / (1 + rank / 10)) +
            (index === 0 ? 0.01 : 0);
          scores.set(title.id, Math.max(scores.get(title.id) ?? 0, score));
        });
      }
    }

    for (const source of sources) {
      if (source.status === 'fulfilled') {
        for (const movie of source.value.results) {
          if (movie.id !== id && !results.has(movie.id)) {
            results.set(movie.id, movie);
          }
        }
      }
    }

    if (!results.size && similar.status === 'rejected') {
      throw similar.reason;
    }

    const collectionIds = new Set(
      collection.status === 'fulfilled'
        ? collection.value.results.map((title) => title.id)
        : [],
    );
    const ranked = [...results.values()].sort((a, b) => {
      if (collectionIds.has(a.id) || collectionIds.has(b.id)) {
        return (
          Number(collectionIds.has(b.id)) - Number(collectionIds.has(a.id))
        );
      }

      return (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) || a.id - b.id;
    });

    return {
      results: ranked.slice(0, 10),
      availability: sources.some(
        (source) =>
          source.status === 'rejected' ||
          source.value.availability === 'partial',
      )
        ? 'partial'
        : 'available',
    };
  }

  findCollection(id: number) {
    return this.movieProvider.findCollection(id);
  }

  public findAll(query: MovieQueryParams): Promise<MovieListResponse> {
    return this.movieProvider.findAll(query);
  }

  public findSuggestions(
    query: string,
    limit: number,
  ): Promise<MovieSuggestionsResponse> {
    return this.movieProvider.findSuggestions(query, limit);
  }

  public findOne(id: number): Promise<MovieDetails | undefined> {
    return this.movieProvider.findOne(id);
  }

  public async findRatings(id: number): Promise<Ratings | undefined> {
    let tmdb;

    try {
      tmdb = await this.movieProvider.findRatings?.(id);
    } catch (error) {
      tmdb = {
        status: 'unavailable' as const,
        reason: ratingFailureReason(error),
      };
    }

    if (tmdb === undefined) {
      return undefined;
    }

    return (
      this.ratings?.findRatings('movie', id, tmdb) ?? {
        tmdb,
        imdb: { status: 'unavailable', reason: 'not-configured' },
      }
    );
  }

  public findMovieSection(id: number, section: MovieSection) {
    return this.movieProvider.findMovieSection(id, section);
  }

  public findWatchProviders(id: number): Promise<WatchProviders | undefined> {
    return this.movieProvider.findWatchProviders(id);
  }
}
