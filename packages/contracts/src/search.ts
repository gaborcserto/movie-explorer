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
  | SeriesSearchResult
  | (PersonSummary & { mediaType: 'person' });

export type SearchMediaType = 'movie' | 'tv' | 'person';
export type SearchType = 'all' | SearchMediaType;

export interface SeriesSearchResult {
  mediaType: 'tv';
  id: number;
  title: string;
  firstAirDate?: string;
  posterUrl?: string;
  backdropUrl?: string;
  description?: string;
  popularity?: number;
  rating?: number;
}

export type SearchResult =
  | (MovieSuggestion & {
      mediaType: 'movie';
      releaseDate?: string;
      backdropUrl?: string;
      description?: string;
      popularity?: number;
      rating?: number;
    })
  | SeriesSearchResult
  | (PersonSummary & { mediaType: 'person'; popularity?: number });

/** Provider relevance order and totals; at most 500 accessible upstream pages. */
export interface SearchResponse {
  results: SearchResult[];
  page: number;
  totalPages: number;
  totalResults: number;
}

export interface SearchSuggestionsResponse {
  groups?: Record<'movie' | 'person', SectionAvailability> & {
    tv?: SectionAvailability;
  };
  suggestions: SearchSuggestion[];
}
