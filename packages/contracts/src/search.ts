import type { MovieSuggestion } from './movies';

export interface PersonSummary {
  id: number;
  name: string;
  profileUrl?: string;
  knownForDepartment?: string;
}

export interface PersonListResponse {
  people: PersonSummary[];
  page: number;
  totalPages: number;
  totalResults: number;
}

export type SearchSuggestion =
  | (MovieSuggestion & { mediaType: 'movie' })
  | (PersonSummary & { mediaType: 'person' });

export interface SearchSuggestionsResponse {
  suggestions: SearchSuggestion[];
}
