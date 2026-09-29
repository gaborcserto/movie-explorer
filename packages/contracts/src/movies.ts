export type MovieId = number;

export type MovieSortField =
  | 'popularity'
  | 'title'
  | 'releaseDate'
  | 'rating';
export type MovieSortOrder = 'asc' | 'desc';

export interface MovieQueryParams {
  sort?: MovieSortField;
  sortOrder?: MovieSortOrder;
  search?: string;
  genre?: string | string[];
  offset?: number;
  limit?: number;
}

export interface MovieSummary {
  id: MovieId;
  title: string;
  releaseDate: string;
  posterUrl: string;
  genres: string[];
}

export interface MovieDetails extends MovieSummary {
  cast: string[];
  description?: string;
  director?: string;
  rating?: number;
  runtimeMinutes?: number;
}

export interface MovieListResponse {
  movies: MovieSummary[];
  total: number;
  offset: number;
  limit: number;
}

export type MovieSearchResponse = MovieListResponse;
