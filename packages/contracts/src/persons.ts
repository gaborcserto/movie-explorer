import type { MovieSummary } from './movies';

export interface PersonCrewCredit {
  department?: string;
  job?: string;
}

export interface PersonFilmographyEntry extends MovieSummary {
  /** Distinct character names; an empty array still records acting participation. */
  actingCredits?: string[];
  crewCredits: PersonCrewCredit[];
}

export interface PersonDetails {
  id: number;
  name: string;
  knownForDepartment?: string;
  birthday?: string;
  deathDate?: string;
  placeOfBirth?: string;
  biography?: string;
  profileUrl?: string;
  profileSrcSet?: string;
  filmography: PersonFilmographyEntry[];
}
