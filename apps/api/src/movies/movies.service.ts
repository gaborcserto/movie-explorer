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
      return this.movieProvider.findRelated(id, kind);
    }

    const [collection, recommended, similar] = await Promise.allSettled([
      this.movieProvider.findCollection(id),
      this.movieProvider.findRelated(id, 'recommendations'),
      this.movieProvider.findRelated(id, 'similar'),
    ]);

    const results = new Map<number, RecommendationTitle>();
    const sources = [collection, recommended, similar];

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

    return {
      results: [...results.values()].slice(0, 10),
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
