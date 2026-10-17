import { Inject, Injectable } from '@nestjs/common';
import type { PersonDetails } from '@movie-explorer/contracts';
import { MOVIE_PROVIDER, MovieProvider } from '../movies/movie-provider';

@Injectable()
export class PersonsService {
  constructor(
    @Inject(MOVIE_PROVIDER) private readonly movieProvider: MovieProvider,
  ) {}

  public findPeople(query: string, page: number) {
    return this.movieProvider.findPeople(query, page);
  }

  public findOne(id: number): Promise<PersonDetails | undefined> {
    return this.movieProvider.findPerson(id);
  }
}
