import { Inject, Injectable, Optional } from '@nestjs/common';
import type {
  Ratings,
  SeriesDetails,
  WatchProviders,
} from '@movie-explorer/contracts';

import type { SeriesProviderQuery } from './series-provider';
import { SERIES_PROVIDER, SeriesProvider } from './series-provider';
import { RatingsService } from '../ratings/ratings.service';
import { ratingFailureReason } from '../ratings/rating-failure-reason';

@Injectable()
export class SeriesService {
  constructor(
    @Inject(SERIES_PROVIDER) private readonly provider: SeriesProvider,
    @Optional() private readonly ratings?: RatingsService,
  ) {}

  findPopular(query: SeriesProviderQuery) {
    return this.provider.findPopular(query);
  }

  findOne(id: number): Promise<SeriesDetails | undefined> {
    return this.provider.findOne(id);
  }

  async findRatings(id: number): Promise<Ratings | undefined> {
    let tmdb;

    try {
      tmdb = await this.provider.findRatings?.(id);
    } catch (error) {
      tmdb = {
        status: 'unavailable' as const,
        reason: ratingFailureReason(error),
      };
    }

    if (tmdb === undefined) {
      return undefined;
    }

    return (
      this.ratings?.findRatings('series', id, tmdb) ?? {
        tmdb,
        imdb: { status: 'unavailable', reason: 'not-configured' },
      }
    );
  }

  findWatchProviders(id: number): Promise<WatchProviders | undefined> {
    return this.provider.findWatchProviders(id);
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
