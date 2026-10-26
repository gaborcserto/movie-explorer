export type WatchProviderCategory = 'streaming' | 'rent' | 'buy';

export interface WatchProvider {
  id: number;
  name: string;
  logoUrl?: string;
  category: WatchProviderCategory;
  region: string;
  watchUrl?: string;
}

export interface WatchProviders {
  providers: WatchProvider[];
}
