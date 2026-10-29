import { Module } from '@nestjs/common';

import { DiscoveryController } from './discovery.controller';
import { DISCOVERY_PROVIDER } from './discovery.tokens';
import { DiscoveryService } from './discovery.service';
import { TmdbDiscoveryProvider } from '../integrations/tmdb/tmdb-discovery.provider';

@Module({
  controllers: [DiscoveryController],
  providers: [
    DiscoveryService,
    {
      provide: DISCOVERY_PROVIDER,
      useFactory: () => new TmdbDiscoveryProvider(),
    },
  ],
})
export class DiscoveryModule {}
