export type {
  Movie,
  MovieListResponse as Movies,
  MovieMutationPayload as MovieData,
} from '@movie-explorer/contracts';

export interface URLParams {
  sort?: string | null;
  search?: string;
  genres?: string | null;
  hash?: string;
}
