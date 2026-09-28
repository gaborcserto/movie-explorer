export interface Movie {
  id: number;
  title: string;
  tagline: string;
  vote_average: number;
  vote_count: number;
  release_date: string;
  poster_path: string;
  overview: string;
  budget: number;
  revenue: number;
  runtime: number;
  genres: string[];
}

export interface MovieListResponse {
  totalAmount: number;
  data: Movie[];
  offset: number;
  limit: number;
}

export type MovieMutationPayload = Pick<
  Movie,
  | 'title'
  | 'release_date'
  | 'poster_path'
  | 'genres'
  | 'vote_average'
  | 'runtime'
  | 'overview'
> &
  Partial<Pick<Movie, 'id' | 'tagline' | 'vote_count' | 'budget' | 'revenue'>>;
