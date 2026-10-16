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
  releaseYear?: number;
  minimumRating?: number;
  page?: number;
}

export interface MovieSummary {
  id: MovieId;
  title: string;
  releaseDate?: string;
  posterUrl: string;
  /** Provider-owned density candidates for posters rendered at up to 320px. */
  posterSrcSet?: string;
  genres: string[];
}

export interface MovieCastMember {
  name: string;
  character?: string;
  profileUrl?: string;
  /** Density candidates for portraits rendered at up to 180px. */
  profileSrcSet?: string;
}

export interface MoviePhoto {
  thumbnailUrl: string;
  fullUrl: string;
  alt?: string;
}

export interface MovieVideo {
  name: string;
  url: string;
  thumbnailUrl?: string;
}

export interface MovieDetails extends MovieSummary {
  /** Small poster image for a decorative loading preview. */
  posterPreviewUrl?: string;
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
  page: number;
  totalPages: number;
  totalResults: number;
}

export type MovieSearchResponse = MovieListResponse;

export interface MovieSuggestion {
  id: MovieId;
  title: string;
  releaseYear?: number;
  posterUrl?: string;
}

export interface MovieSuggestionsResponse {
  suggestions: MovieSuggestion[];
}
