import { Module } from '@nestjs/common';

import { TmdbSeriesProvider } from '../integrations/tmdb/tmdb-series.provider';
import { SERIES_PROVIDER } from './series-provider';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';

@Module({
  controllers: [SeriesController],
  providers: [
    SeriesService,
    { provide: SERIES_PROVIDER, useFactory: () => new TmdbSeriesProvider() },
  ],
})
export class SeriesModule {}
