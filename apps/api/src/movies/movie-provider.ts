import type {
  MovieDetails,
  MovieListResponse,
  MovieQueryParams,
} from '@movie-explorer/contracts';

export interface MovieProvider {
  findAll(query: MovieQueryParams): Promise<MovieListResponse>;
  findOne(id: number): Promise<MovieDetails | undefined>;
}

export const MOVIE_PROVIDER = Symbol('MOVIE_PROVIDER');
