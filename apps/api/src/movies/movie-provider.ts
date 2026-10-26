import type {
  MovieDetails,
  WatchProviders,
  MovieSection,
  MovieSectionResponse,
  MovieListResponse,
  MovieQueryParams,
  MovieSuggestionsResponse,
  PersonDetails,
  PersonListResponse,
  RatingResult,
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
  findRatings?(id: number): Promise<RatingResult | undefined>;
  findWatchProviders(id: number): Promise<WatchProviders | undefined>;
}

export const MOVIE_PROVIDER = Symbol('MOVIE_PROVIDER');
