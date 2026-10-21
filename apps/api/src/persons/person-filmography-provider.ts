import type {
  CombinedFilmography,
  FilmographyMediaType,
  PersonDetails,
} from '@movie-explorer/contracts';

export const PERSON_FILMOGRAPHY_PROVIDER = Symbol(
  'PERSON_FILMOGRAPHY_PROVIDER',
);

export interface PersonFilmographyProvider {
  findPerson(id: number): Promise<PersonDetails | undefined>;
  findCombined(
    id: number,
    mediaType: FilmographyMediaType,
  ): Promise<CombinedFilmography | undefined>;
}
