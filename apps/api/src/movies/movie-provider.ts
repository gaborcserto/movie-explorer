import type {
  MovieDetails,
  MovieSection,
  MovieSectionResponse,
  MovieListResponse,
  MovieQueryParams,
  MovieSuggestionsResponse,
  PersonDetails,
  PersonListResponse,
} from '@movie-explorer/contracts';

export interface MovieProvider {
  findMovieSection(
    id: number,
    section: MovieSection,
  ): Promise<MovieSectionResponse>;
  findFilmography(id: number): Promise<Pick<PersonDetails, 'filmography'>>;
  findPeople(query: string, page: number): Promise<PersonListResponse>;
  findPerson(id: number): Promise<PersonDetails | undefined>;
  findAll(query: MovieQueryParams): Promise<MovieListResponse>;
  findSuggestions(
    query: string,
    limit: number,
  ): Promise<MovieSuggestionsResponse>;
  findOne(id: number): Promise<MovieDetails | undefined>;
}

export const MOVIE_PROVIDER = Symbol('MOVIE_PROVIDER');
