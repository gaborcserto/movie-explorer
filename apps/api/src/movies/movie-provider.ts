import type {
  MovieDetails,
  MovieListResponse,
  MovieQueryParams,
  MovieSuggestionsResponse,
  PersonDetails,
} from '@movie-explorer/contracts';

export interface MovieProvider {
  findPerson(id: number): Promise<PersonDetails | undefined>;
  findAll(query: MovieQueryParams): Promise<MovieListResponse>;
  findSuggestions(
    query: string,
    limit: number,
  ): Promise<MovieSuggestionsResponse>;
  findOne(id: number): Promise<MovieDetails | undefined>;
}

export const MOVIE_PROVIDER = Symbol('MOVIE_PROVIDER');
