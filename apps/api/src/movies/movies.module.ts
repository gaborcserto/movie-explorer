import { Module } from '@nestjs/common';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';
import { MOVIE_PROVIDER } from './movie-provider';
import { TmdbMovieProvider } from '../integrations/tmdb/tmdb-movie.provider';
import { PersonsController } from '../persons/persons.controller';
import { PersonsService } from '../persons/persons.service';

@Module({
  controllers: [MoviesController, PersonsController],
  providers: [
    MoviesService,
    PersonsService,
    {
      provide: MOVIE_PROVIDER,
      useFactory: () => new TmdbMovieProvider(),
    },
  ],
})
export class MoviesModule {}
