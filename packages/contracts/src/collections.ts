import type { RecommendationTitle } from './recommendations';

export interface MovieCollection {
  id: number;
  name?: string;
  posterUrl?: string;
  backdropUrl?: string;
}

/** Other movies in the collection, dated titles first, then unknown dates by ID. */
export interface MovieCollectionResponse {
  collection: MovieCollection | null;
  results: Extract<RecommendationTitle, { mediaType: 'movie' }>[];
  /** Partial means malformed parts were skipped; absent metadata is allowed. */
  availability: 'available' | 'partial';
}
