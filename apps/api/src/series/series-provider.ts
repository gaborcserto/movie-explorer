import type {
  SeriesDetails,
  SearchResponse,
  SeasonDetails,
  EpisodeDetails,
  EpisodeCredits,
  SeriesCredits,
  SeriesImages,
  SeriesVideos,
  WatchProviders,
  RatingResult,
} from '@movie-explorer/contracts';

export const SERIES_PROVIDER = Symbol('SERIES_PROVIDER');

export interface SeriesProviderQuery {
  page?: number;
  year?: number;
  minimumRating?: number;
  sort: 'popularity' | 'firstAirDate' | 'rating' | 'title';
  order: 'asc' | 'desc';
}

export interface SeriesProvider {
  findPopular(query: SeriesProviderQuery): Promise<SearchResponse>;
  findImages(id: number): Promise<SeriesImages | undefined>;
  findVideos(id: number): Promise<SeriesVideos | undefined>;
  findCredits(id: number): Promise<SeriesCredits | undefined>;
  findOne(id: number): Promise<SeriesDetails | undefined>;
  findRatings?(id: number): Promise<RatingResult | undefined>;
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
  findWatchProviders(id: number): Promise<WatchProviders | undefined>;
}
