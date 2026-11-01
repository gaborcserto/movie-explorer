import type {
  DiscoverySection,
  SearchResponse,
  StreamingProviderInfo,
} from '@movie-explorer/contracts';

import type { RecommendationProvider } from '../recommendations/recommendation-provider';

export interface DiscoveryProvider extends RecommendationProvider {
  find(section: DiscoverySection, page: number): Promise<SearchResponse>;
  findStreamingProviders(region: string): Promise<StreamingProviderInfo[]>;
  findStreaming(
    providerId: number,
    region: string,
    page: number,
  ): Promise<SearchResponse>;
}

export const DISCOVERY_PROVIDER = Symbol('DISCOVERY_PROVIDER');
