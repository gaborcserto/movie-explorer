import { Module } from '@nestjs/common';

import { TmdbExternalIds } from '../integrations/tmdb/tmdb-external-ids';
import { OmdbAdapter } from '../integrations/omdb/omdb.adapter';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';

@Module({
  controllers: [RatingsController],
  providers: [
    { provide: TmdbExternalIds, useFactory: () => new TmdbExternalIds() },
    { provide: OmdbAdapter, useFactory: () => new OmdbAdapter() },
    RatingsService,
  ],
  exports: [TmdbExternalIds, RatingsService],
})
export class RatingsModule {}
