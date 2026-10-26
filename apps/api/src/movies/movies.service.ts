import { HttpException, Inject, Injectable, Optional } from '@nestjs/common';
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
      const status = error instanceof HttpException ? error.getStatus() : 502;
      let reason: 'timeout' | 'invalid-response' | 'upstream-error';

      if (status === 504) {
        reason = 'timeout';
      } else if (
        error instanceof HttpException &&
        error.message === 'Movie provider response was invalid'
      ) {
        reason = 'invalid-response';
      } else {
        reason = 'upstream-error';
      }

      tmdb = {
        status: 'unavailable' as const,
        reason,
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
