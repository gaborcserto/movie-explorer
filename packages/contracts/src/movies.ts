export type MovieId = number;

export type MovieSortField = 'title' | 'releaseDate' | 'rating';
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
  rating: number;
  runtimeMinutes: number;
  description: string;
}

export interface MovieListResponse {
  movies: MovieSummary[];
  total: number;
  offset: number;
  limit: number;
}

export type MovieSearchResponse = MovieListResponse;

export interface MovieMutationPayload {
  id?: MovieId;
  title: string;
  releaseDate: string;
  posterUrl: string;
  genres: string[];
  rating: number;
  runtimeMinutes: number;
  description: string;
}
