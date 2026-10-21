// Only core identity is required; optional provider metadata is narrowed by the mapper.
export interface TmdbSeriesDetails extends Record<string, unknown> {
  id: number;
  name: string;
}

export interface TmdbEpisode extends Record<string, unknown> {
  id: number;
  name: string;
  season_number: number;
  episode_number: number;
}

export interface TmdbSeason extends Record<string, unknown> {
  id: number;
  name: string;
  season_number: number;
  episodes: TmdbEpisode[];
}
