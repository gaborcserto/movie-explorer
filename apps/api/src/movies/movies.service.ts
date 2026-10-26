import { Inject, Injectable } from '@nestjs/common';
import type {
  MovieDetails,
  WatchProviders,
  MovieListResponse,
  MovieQueryParams,
  MovieSection,
  MovieSuggestionsResponse,
} from '@movie-explorer/contracts';

import { MOVIE_PROVIDER, MovieProvider } from './movie-provider';

@Injectable()
export class MoviesService {
  constructor(
    @Inject(MOVIE_PROVIDER)
    private readonly movieProvider: MovieProvider,
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

  public findMovieSection(id: number, section: MovieSection) {
    return this.movieProvider.findMovieSection(id, section);
  }

  public findWatchProviders(id: number): Promise<WatchProviders | undefined> {
    return this.movieProvider.findWatchProviders(id);
  }
}
