export type RatingResult =
  | { status: 'available'; score: number; voteCount: number | null }
  | { status: 'missing' }
  | {
      status: 'unavailable';
      reason:
        'timeout' | 'upstream-error' | 'invalid-response' | 'not-configured';
      retryAfterSeconds?: number;
    };

export interface Ratings {
  tmdb: RatingResult;
  imdb: RatingResult;
}

/** Legacy IMDb-only representation retained for existing API consumers. */
export interface ImdbRating {
  score: number;
  voteCount: number | null;
}

export interface ImdbRatingResponse {
  imdb: ImdbRating | null;
}
