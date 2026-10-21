import { Inject, Injectable } from '@nestjs/common';
import type {
  FilmographyMediaType,
  PersonDetails,
} from '@movie-explorer/contracts';

import {
  PERSON_FILMOGRAPHY_PROVIDER,
  PersonFilmographyProvider,
} from './person-filmography-provider';
import { MOVIE_PROVIDER, MovieProvider } from '../movies/movie-provider';

@Injectable()
export class PersonsService {
  constructor(
    @Inject(MOVIE_PROVIDER) private readonly movieProvider: MovieProvider,
    @Inject(PERSON_FILMOGRAPHY_PROVIDER)
    private readonly filmographyProvider: PersonFilmographyProvider,
  ) {}

  public findPeople(query: string, page: number) {
    return this.movieProvider.findPeople(query, page);
  }

  public findOne(
    id: number,
    include?: 'combinedFilmography',
  ): Promise<PersonDetails | undefined> {
    return include === 'combinedFilmography'
      ? this.filmographyProvider.findPerson(id)
      : this.movieProvider.findPerson(id);
  }

  public findCombined(id: number, mediaType: FilmographyMediaType) {
    return this.filmographyProvider.findCombined(id, mediaType);
  }

  public findFilmography(id: number) {
    return this.movieProvider.findFilmography(id);
  }
}
