// Only core identity is required; optional provider metadata is narrowed by the mapper.
export interface TmdbTvDetails extends Record<string, unknown> {
  id: number;
  name: string;
}
