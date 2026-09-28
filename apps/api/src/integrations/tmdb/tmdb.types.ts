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
  genres: TmdbGenre[];
  id: number;
  overview: string;
  poster_path: string | null;
  release_date: string;
  runtime: number | null;
  title: string;
  vote_average: number;
}
