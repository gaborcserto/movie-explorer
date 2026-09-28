import { Inject, Injectable, NotImplementedException } from '@nestjs/common';
import type {
  MovieDetails,
  MovieListResponse,
  MovieMutationPayload,
} from '@movie-explorer/contracts';
import { GetMoviesQuery } from './movies.dto';
import { MOVIE_PROVIDER, MovieProvider } from './movie-provider';

@Injectable()
export class MoviesService {
  constructor(
    @Inject(MOVIE_PROVIDER)
    private readonly movieProvider: MovieProvider,
  ) {}

  public findAll(query: GetMoviesQuery): Promise<MovieListResponse> {
    return this.movieProvider.findAll(query);
  }

  public findOne(id: number): Promise<MovieDetails | undefined> {
    return this.movieProvider.findOne(id);
  }

  public async create(_movie: MovieMutationPayload): Promise<void> {
    void _movie;
    throw this.getMutationNotSupportedError();
  }

  public async update(
    _id: number,
    _movie: MovieMutationPayload,
  ): Promise<MovieDetails> {
    void _id;
    void _movie;
    throw this.getMutationNotSupportedError();
  }

  public async delete(_id: number): Promise<MovieDetails> {
    void _id;
    throw this.getMutationNotSupportedError();
  }

  private getMutationNotSupportedError(): NotImplementedException {
    return new NotImplementedException(
      'Movie mutations are not supported by the configured movie provider',
    );
  }
}
