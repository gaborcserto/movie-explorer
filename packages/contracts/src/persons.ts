import type { MoviePhoto, MovieSummary } from './movies';
import type { SectionAvailability } from './availability';
import type { SeriesSummary } from './series';

export interface PersonCrewCredit {
  creditId?: string;
  episodeCount?: number | null;
  department?: string;
  job?: string;
}

export interface PersonFilmographyEntry extends MovieSummary {
  /** Distinct character names; an empty array still records acting participation. */
  actingCredits?: string[];
  crewCredits: PersonCrewCredit[];
}

export interface PersonDetails {
  combinedFilmography?: CombinedFilmography;
  filmographyAvailability?: SectionAvailability;
  id: number;
  name: string;
  knownForDepartment?: string;
  birthday?: string;
  deathDate?: string;
  placeOfBirth?: string;
  biography?: string;
  profileUrl?: string;
  profileSrcSet?: string;
  /** Primary portrait first, followed by distinct available profile images. */
  profilePhotos?: MoviePhoto[];
  filmography: PersonFilmographyEntry[];
}

export interface PersonActingRole {
  creditId: string | null;
  character: string | null;
  episodeCount: number | null;
}

export interface PersonMovieCredit extends PersonFilmographyEntry {
  mediaType: 'movie';
}

export interface PersonSeriesCredit extends SeriesSummary {
  actingCredits?: string[];
  actingRoles?: PersonActingRole[];
  crewCredits: PersonCrewCredit[];
}

export type CombinedFilmographyEntry = PersonMovieCredit | PersonSeriesCredit;
export type FilmographyMediaType = 'all' | 'movie' | 'tv';

export interface CombinedFilmography {
  entries: CombinedFilmographyEntry[];
  /** Scoped recovery contains only requested group keys; embedded data contains both. */
  groups: Partial<Record<'movie' | 'tv', SectionAvailability>>;
}
