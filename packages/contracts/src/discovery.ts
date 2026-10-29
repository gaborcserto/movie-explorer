export type DiscoverySection =
  | "trending"
  | "new-movies"
  | "new-series"
  | "popular-movies"
  | "popular-series"
  | "cinema"
  | "coming-soon"
  | "streaming-movies"
  | "streaming-series";

export interface StreamingProviderInfo {
  id: number;
  name: string;
}
