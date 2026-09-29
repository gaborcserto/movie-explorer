import { Inject, Injectable } from '@nestjs/common';
import type {
  MovieDetails,
  MovieListResponse,
  MovieQueryParams,
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
}
