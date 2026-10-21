import { Inject, Injectable } from '@nestjs/common';
import type { SeriesDetails } from '@movie-explorer/contracts';

import type { SeriesListQuery } from './series-list.dto';
import { SERIES_PROVIDER, SeriesProvider } from './series-provider';

@Injectable()
export class SeriesService {
  constructor(
    @Inject(SERIES_PROVIDER) private readonly provider: SeriesProvider,
  ) {}

  findPopular(query: SeriesListQuery) {
    return this.provider.findPopular(query);
  }

  findOne(id: number): Promise<SeriesDetails | undefined> {
    return this.provider.findOne(id);
  }

  findSeason(id: number, season: number) {
    return this.provider.findSeason(id, season);
  }

  findImages(id: number) {
    return this.provider.findImages(id);
  }

  findVideos(id: number) {
    return this.provider.findVideos(id);
  }

  findCredits(id: number) {
    return this.provider.findCredits(id);
  }

  findEpisode(id: number, season: number, episode: number) {
    return this.provider.findEpisode(id, season, episode);
  }

  findEpisodeCredits(id: number, season: number, episode: number) {
    return this.provider.findEpisodeCredits(id, season, episode);
  }
}
