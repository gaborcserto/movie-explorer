import { RatingsModule } from '../ratings/ratings.module';
import { TmdbExternalIds } from '../integrations/tmdb/tmdb-external-ids';
import { Module } from '@nestjs/common';

import { TmdbSeriesProvider } from '../integrations/tmdb/tmdb-series.provider';
import { SERIES_PROVIDER } from './series-provider';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';

@Module({
  imports: [RatingsModule],
  controllers: [SeriesController],
  providers: [
    SeriesService,
    {
      provide: SERIES_PROVIDER,
      useFactory: (ids: TmdbExternalIds) =>
        new TmdbSeriesProvider(undefined, ids),
      inject: [TmdbExternalIds],
    },
  ],
})
export class SeriesModule {}
