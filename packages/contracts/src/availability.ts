/** Available includes a successfully loaded empty section. */
export type SectionAvailability =
  | { status: 'available' }
  | { status: 'unavailable'; retryAfterSeconds?: number };

/** The photos retry route supplies the backdrop collection. */
export type MovieSection = 'credits' | 'videos' | 'photos' | 'posters';
