import { Module } from '@nestjs/common';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';
import { MOVIE_PROVIDER } from './movie-provider';
import { TmdbMovieProvider } from '../integrations/tmdb/tmdb-movie.provider';

@Module({
  controllers: [MoviesController],
  providers: [
    MoviesService,
    {
      provide: MOVIE_PROVIDER,
      useFactory: () => new TmdbMovieProvider(),
    },
  ],
})
export class MoviesModule {}
