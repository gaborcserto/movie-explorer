import { Module } from '@nestjs/common';

import { TmdbTvProvider } from '../integrations/tmdb/tmdb-tv.provider';
import { TV_PROVIDER } from './tv-provider';
import { TvController } from './tv.controller';
import { TvService } from './tv.service';

@Module({
  controllers: [TvController],
  providers: [
    TvService,
    { provide: TV_PROVIDER, useFactory: () => new TmdbTvProvider() },
  ],
})
export class TvModule {}
