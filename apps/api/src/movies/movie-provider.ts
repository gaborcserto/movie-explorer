import type {
  MovieDetails,
  MovieListResponse,
} from '@movie-explorer/contracts';

export type MovieSortField = 'title' | 'releaseDate' | 'rating';
export type MovieSortOrder = 'asc' | 'desc';

export interface MovieSearchQuery {
  sort?: MovieSortField;
  sortOrder?: MovieSortOrder;
  search?: string;
  genre?: string | string[];
  offset?: number;
  limit?: number;
}

export interface MovieProvider {
  findAll(query: MovieSearchQuery): Promise<MovieListResponse>;
  findOne(id: number): Promise<MovieDetails | undefined>;
}

export const MOVIE_PROVIDER = Symbol('MOVIE_PROVIDER');
