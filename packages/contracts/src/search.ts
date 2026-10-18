import type { MovieSuggestion } from './movies';
import type { SectionAvailability } from './availability';

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
  groups?: Record<'movie' | 'person', SectionAvailability>;
  suggestions: SearchSuggestion[];
}
