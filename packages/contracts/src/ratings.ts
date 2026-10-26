export interface ImdbRating {
  /** Original IMDb score on the 0–10 scale, supplied by OMDb. */
  score: number;
  voteCount: number | null;
}

export interface ImdbRatingResponse {
  /** null includes missing configuration, missing IDs, and upstream failures. */
  imdb: ImdbRating | null;
}
