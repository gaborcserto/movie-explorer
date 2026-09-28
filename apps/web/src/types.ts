export interface Movie {
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
  id: number;
}

export interface Movies {
  totalAmount: number;
  data: Movie[];
  offset: number;
  limit: number;
}

export interface MovieData {
  id: number;
  title: string;
  release_date: string;
  poster_path: string;
  genres: string[];
  vote_average: number;
  runtime: number;
  overview: string;
}

export interface URLParams {
  sort?: string | null;
  search?: string;
  genres?: string | null;
  hash?: string;
}
