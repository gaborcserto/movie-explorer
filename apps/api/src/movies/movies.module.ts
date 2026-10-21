import { Module } from '@nestjs/common';

import { PERSON_FILMOGRAPHY_PROVIDER } from '../persons/person-filmography-provider';
import { TmdbPersonFilmographyProvider } from '../integrations/tmdb/tmdb-person-filmography.provider';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';
import { MOVIE_PROVIDER } from './movie-provider';
import { TmdbMovieProvider } from '../integrations/tmdb/tmdb-movie.provider';
import { PersonsController } from '../persons/persons.controller';
import { PersonsService } from '../persons/persons.service';
import { SearchController } from '../search/search.controller';
import { SearchService } from '../search/search.service';
import { SEARCH_PROVIDER } from '../search/search-provider';
import { TmdbSearchProvider } from '../integrations/tmdb/tmdb-search.provider';

@Module({
  controllers: [MoviesController, PersonsController, SearchController],
  providers: [
    { provide: SEARCH_PROVIDER, useFactory: () => new TmdbSearchProvider() },
    {
      provide: PERSON_FILMOGRAPHY_PROVIDER,
      useFactory: () => new TmdbPersonFilmographyProvider(),
    },
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
