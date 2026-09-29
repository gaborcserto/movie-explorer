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

export interface MovieCastMember {
  name: string;
  character?: string;
  profileUrl?: string;
}

export interface MoviePhoto {
  imageUrl: string;
  alt?: string;
}

export interface MovieVideo {
  name: string;
  url: string;
  thumbnailUrl?: string;
}

export interface MovieDetails extends MovieSummary {
  cast: string[];
  castMembers?: MovieCastMember[];
  description?: string;
  director?: string;
  rating?: number;
  runtimeMinutes?: number;
  backdropUrl?: string;
  photos?: MoviePhoto[];
  videos?: MovieVideo[];
}

export interface MovieListResponse {
  movies: MovieSummary[];
  total: number;
  offset: number;
  limit: number;
}

export type MovieSearchResponse = MovieListResponse;
