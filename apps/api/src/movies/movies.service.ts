import { Inject, Injectable } from '@nestjs/common';
import type {
  MovieDetails,
  MovieListResponse,
  MovieQueryParams,
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

  public findOne(id: number): Promise<MovieDetails | undefined> {
    return this.movieProvider.findOne(id);
  }
}
