export type MovieId = number;

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
