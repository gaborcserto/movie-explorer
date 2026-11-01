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

export type RelatedTitleKind = 'similar' | 'recommendations';

/** Ranked first-page titles; independent of the homepage candidate pools. */
export interface RelatedTitlesResponse {
  results: RecommendationTitle[];
  /** Partial means malformed source entries were omitted. Empty can be available. */
  availability: 'available' | 'partial';
}

export interface RecommendationResponse {
  category: RecommendationCategory;
  /** Up to ten unique titles sampled from the first five source pages. */
  results: RecommendationTitle[];
  /** Available includes an empty source; partial means source pages failed. */
  availability: 'available' | 'partial';
  /** Valid unique candidates, at most 100; fewer candidates are normal. */
  candidateCount: number;
}

/** IDs belong only to mediaType. No library snapshots or preference metadata. */
export interface PersonalizedRecommendationRequest {
  mediaType: 'movie' | 'tv';
  /** At most three distinct seeds, selected deterministically by the client. */
  favoriteIds: number[];
  /** At most 1000 distinct Favorites/Watched IDs; seeds are excluded implicitly. */
  excludedIds: number[];
}

export interface PersonalizedRecommendationResponse extends RelatedTitlesResponse {
  /** Partial includes failed or malformed Similar/Popular sources. */
  availability: 'available' | 'partial';
  mediaType: 'movie' | 'tv';
  source: 'favorites' | 'mixed' | 'popular';
}
