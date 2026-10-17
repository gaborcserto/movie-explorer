import { Module } from '@nestjs/common';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';
import { MOVIE_PROVIDER } from './movie-provider';
import { TmdbMovieProvider } from '../integrations/tmdb/tmdb-movie.provider';
import { PersonsController } from '../persons/persons.controller';
import { PersonsService } from '../persons/persons.service';
import { SearchController } from '../search/search.controller';
import { SearchService } from '../search/search.service';

@Module({
  controllers: [MoviesController, PersonsController, SearchController],
  providers: [
    MoviesService,
    PersonsService,
    SearchService,
    {
      provide: MOVIE_PROVIDER,
      useFactory: () => new TmdbMovieProvider(),
    },
  ],
})
export class MoviesModule {}
