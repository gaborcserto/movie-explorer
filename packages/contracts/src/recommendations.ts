import type { SearchResult } from './search';

export type RecommendationCategory =
  | 'popular-movies'
  | 'top-rated-movies'
  | 'popular-series'
  | 'top-rated-series';

/** Existing card data, identified by mediaType:id; people are excluded. */
export type RecommendationTitle = Extract<
  SearchResult,
  { mediaType: 'movie' | 'tv' }
>;

export interface RecommendationResponse {
  category: RecommendationCategory;
  /** Up to ten unique titles sampled from the first five source pages. */
  results: RecommendationTitle[];
  /** Available includes an empty source; partial means source pages failed. */
  availability: 'available' | 'partial';
  /** Valid unique candidates, at most 100; fewer candidates are normal. */
  candidateCount: number;
}
