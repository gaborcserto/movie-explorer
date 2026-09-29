export interface TmdbPagedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TmdbMovieListItem {
  genre_ids: number[];
  id: number;
  overview: string;
  poster_path: string | null;
  popularity: number;
  release_date: string;
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
  credits?: TmdbCredits;
  images?: TmdbImages;
  videos?: TmdbVideos;
  genres: TmdbGenre[];
  id: number;
  overview: string;
  poster_path: string | null;
  release_date: string;
  runtime: number | null;
  title: string;
  vote_average: number;
  backdrop_path?: string | null;
}

export interface TmdbCredits {
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
}

export interface TmdbCastMember {
  name: string;
  order: number;
  character?: string;
  profile_path?: string | null;
}

export interface TmdbCrewMember {
  job: string;
  name: string;
}

export interface TmdbImages {
  backdrops: TmdbImage[];
}

export interface TmdbImage {
  file_path: string;
  width: number;
  height: number;
}

export interface TmdbVideos {
  results: TmdbVideo[];
}

export interface TmdbVideo {
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}
