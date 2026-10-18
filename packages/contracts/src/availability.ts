/** Available includes a successfully loaded empty section. */
export type SectionAvailability =
  | { status: 'available' }
  | { status: 'unavailable'; retryAfterSeconds?: number };

export type MovieSection = 'credits' | 'videos' | 'photos';
