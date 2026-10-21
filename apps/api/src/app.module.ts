import { Module } from '@nestjs/common';
import { SeriesModule } from './series/series.module';
import { MoviesModule } from './movies/movies.module';
import { APP_FILTER } from '@nestjs/core';
import { HttpErrorFilter } from './http-error.filter';

@Module({
  imports: [MoviesModule, SeriesModule],
  providers: [{ provide: APP_FILTER, useClass: HttpErrorFilter }],
})
export class AppModule {}
