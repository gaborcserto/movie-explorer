import type { MovieSection, SectionAvailability } from './availability';

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
  id?: number;
  name: string;
  character?: string;
  profileUrl?: string;
  /** Density candidates for portraits rendered at up to 180px. */
  profileSrcSet?: string;
}

export interface MovieDirector {
  id?: number;
  name: string;
  profileUrl?: string;
  profileSrcSet?: string;
}

export interface MovieCrewMember extends MovieDirector {
  roles: string[];
}

export interface MoviePhoto {
  filePath?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  language?: string | null;
  thumbnailUrl: string;
  fullUrl: string;
  alt?: string;
}

export interface MovieVideo {
  id?: string;
  key?: string;
  site?: string;
  type?: string;
  language?: string | null;
  name: string;
  /** Empty when the source site has no supported external link. */
  url: string;
  thumbnailUrl?: string;
}

export interface MovieDetails extends MovieSummary {
  originalTitle?: string;
  status?: string;
  originalLanguage?: string;
  /** Movie budget in USD; zero represents an unknown amount. */
  budget?: number;
  /** Movie revenue in USD; zero represents an unknown amount. */
  revenue?: number;
  sections?: Record<Exclude<MovieSection, 'posters'>, SectionAvailability> & {
    posters?: SectionAvailability;
  };
  /** Small poster image for a decorative loading preview. */
  posterPreviewUrl?: string;
  cast: string[];
  castMembers?: MovieCastMember[];
  description?: string;
  director?: string;
  directors?: MovieDirector[];
  writers?: MovieCrewMember[];
  producers?: MovieCrewMember[];
  rating?: number;
  runtimeMinutes?: number;
  backdropUrl?: string;
  backdrops?: MoviePhoto[];
  posters?: MoviePhoto[];
  /** Legacy backdrop collection; new API responses use backdrops. */
  photos?: MoviePhoto[];
  videos?: MovieVideo[];
}

export interface MovieSectionResponse {
  cast?: string[];
  castMembers?: MovieCastMember[];
  director?: string;
  directors?: MovieDirector[];
  writers?: MovieCrewMember[];
  producers?: MovieCrewMember[];
  photos?: MoviePhoto[];
  backdrops?: MoviePhoto[];
  posters?: MoviePhoto[];
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
