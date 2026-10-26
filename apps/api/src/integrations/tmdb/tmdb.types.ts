export interface TmdbPagedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TmdbMovieListItem {
  genre_ids?: number[];
  id: number;
  overview: string;
  poster_path: string | null;
  popularity: number;
  release_date?: string;
  title: string;
  vote_average: number;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbGenreListResponse {
  genres: TmdbGenre[];
}

export interface TmdbMovieDetails {
  original_title?: unknown;
  status?: unknown;
  original_language?: unknown;
  budget?: unknown;
  revenue?: unknown;
  credits?: TmdbCredits;
  images?: TmdbImages;
  videos?: TmdbVideos;
  genres: TmdbGenre[];
  id: number;
  overview: string;
  poster_path: string | null;
  release_date?: string;
  runtime: number | null;
  title: string;
  vote_average: number;
  vote_count?: unknown;
  backdrop_path?: string | null;
}

export interface TmdbCredits {
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
}

export interface TmdbCastMember {
  id?: number;
  name: string;
  order: number;
  character?: string;
  profile_path?: string | null;
}

export interface TmdbCrewMember {
  department?: string;
  id?: number;
  profile_path?: string | null;
  job: string;
  name: string;
}

export interface TmdbPersonProfile {
  images?: unknown;
  id: number;
  name: string;
  known_for_department?: unknown;
  birthday?: unknown;
  deathday?: unknown;
  place_of_birth?: unknown;
  biography?: unknown;
  profile_path?: unknown;
}

export interface TmdbPersonMovieCredits {
  cast: unknown[];
  crew: unknown[];
}

export interface TmdbPersonDetails extends TmdbPersonProfile {
  movie_credits: TmdbPersonMovieCredits;
}

export interface TmdbImages {
  backdrops?: TmdbImage[];
  posters?: TmdbImage[];
  logos?: TmdbImage[];
}

export interface TmdbImage {
  file_path: string;
  width: number;
  height: number;
  aspect_ratio?: number;
  iso_639_1?: string | null;
}

export interface TmdbVideos {
  results: TmdbVideo[];
}

export interface TmdbVideo {
  published_at?: string;
  id?: string;
  iso_639_1?: string | null;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}
