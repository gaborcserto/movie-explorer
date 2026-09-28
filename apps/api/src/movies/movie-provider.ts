import type {
  MovieDetails,
  MovieListResponse,
  MovieQueryParams,
} from '@movie-explorer/contracts';

export type MovieSearchQuery = MovieQueryParams;

export interface MovieProvider {
  findAll(query: MovieSearchQuery): Promise<MovieListResponse>;
  findOne(id: number): Promise<MovieDetails | undefined>;
}

export const MOVIE_PROVIDER = Symbol('MOVIE_PROVIDER');
