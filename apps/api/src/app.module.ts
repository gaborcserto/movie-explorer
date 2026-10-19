import { Module } from '@nestjs/common';
import { MoviesModule } from './movies/movies.module';
import { APP_FILTER } from '@nestjs/core';
import { HttpErrorFilter } from './http-error.filter';

@Module({
  imports: [MoviesModule],
  providers: [{ provide: APP_FILTER, useClass: HttpErrorFilter }],
})
export class AppModule {}
