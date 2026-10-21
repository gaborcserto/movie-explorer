import { Inject, Injectable } from '@nestjs/common';
import type { SeriesDetails } from '@movie-explorer/contracts';

import { SERIES_PROVIDER, SeriesProvider } from './series-provider';

@Injectable()
export class SeriesService {
  constructor(
    @Inject(SERIES_PROVIDER) private readonly provider: SeriesProvider,
  ) {}

  findOne(id: number): Promise<SeriesDetails | undefined> {
    return this.provider.findOne(id);
  }

  findSeason(id: number, season: number) {
    return this.provider.findSeason(id, season);
  }

  findEpisode(id: number, season: number, episode: number) {
    return this.provider.findEpisode(id, season, episode);
  }

  findEpisodeCredits(id: number, season: number, episode: number) {
    return this.provider.findEpisodeCredits(id, season, episode);
  }
}
