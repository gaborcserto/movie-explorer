import type {
  SeriesDetails,
  SeasonDetails,
  EpisodeDetails,
  EpisodeCredits,
  SeriesCredits,
  SeriesImages,
  SeriesVideos,
} from '@movie-explorer/contracts';

export const SERIES_PROVIDER = Symbol('SERIES_PROVIDER');

export interface SeriesProvider {
  findImages(id: number): Promise<SeriesImages | undefined>;
  findVideos(id: number): Promise<SeriesVideos | undefined>;
  findCredits(id: number): Promise<SeriesCredits | undefined>;
  findOne(id: number): Promise<SeriesDetails | undefined>;
  findSeason(id: number, season: number): Promise<SeasonDetails | undefined>;
  findEpisode(
    id: number,
    season: number,
    episode: number,
  ): Promise<EpisodeDetails | undefined>;
  findEpisodeCredits(
    id: number,
    season: number,
    episode: number,
  ): Promise<EpisodeCredits | undefined>;
}
