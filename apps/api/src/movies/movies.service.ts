import { Inject, Injectable, Optional } from '@nestjs/common';
import type {
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
