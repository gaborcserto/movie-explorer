import { Inject, Injectable } from '@nestjs/common';
import type {
  SearchResponse,
  StreamingProviderInfo,
} from '@movie-explorer/contracts';

import { DISCOVERY_PROVIDER } from './discovery.tokens';
import type { DiscoveryProvider } from './discovery.tokens';
import type { DiscoverySection } from '@movie-explorer/contracts';

@Injectable()
export class DiscoveryService {
  constructor(
    @Inject(DISCOVERY_PROVIDER) private readonly provider: DiscoveryProvider,
  ) {}

  find(section: DiscoverySection, page: number): Promise<SearchResponse> {
    return this.provider.find(section, page);
  }

  findStreamingProviders(region: string): Promise<StreamingProviderInfo[]> {
    return this.provider.findStreamingProviders(region);
  }

  findStreaming(
    providerId: number,
    region: string,
    page: number,
  ): Promise<SearchResponse> {
    return this.provider.findStreaming(providerId, region, page);
  }
}
