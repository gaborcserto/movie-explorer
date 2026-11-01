import { Module } from '@nestjs/common';

import { DiscoveryController } from './discovery.controller';
import { DISCOVERY_PROVIDER } from './discovery.tokens';
import { DiscoveryService } from './discovery.service';
import { TmdbDiscoveryProvider } from '../integrations/tmdb/tmdb-discovery.provider';
import { RecommendationsController } from '../recommendations/recommendations.controller';
import { RecommendationsService } from '../recommendations/recommendations.service';

@Module({
  controllers: [DiscoveryController, RecommendationsController],
  providers: [
    DiscoveryService,
    RecommendationsService,
    {
      provide: DISCOVERY_PROVIDER,
      useFactory: () => new TmdbDiscoveryProvider(),
    },
  ],
})
export class DiscoveryModule {}
