import { Injectable, Logger } from '@nestjs/common';
import type { SeriesDetails } from '@movie-explorer/contracts';

import type { SeriesProvider } from '../../series/series-provider';
import { getTmdbConfig, TmdbConfig } from './tmdb.config';
import { TmdbTransport } from './tmdb.transport';
import { TmdbSeriesMapper } from './tmdb-series.mapper';
import {
  validateTmdbSeriesDetails,
  validateTmdbSeason,
  validateTmdbEpisode,
  seriesRecord,
  seriesPositiveId,
} from './tmdb-series.validation';

@Injectable()
export class TmdbSeriesProvider implements SeriesProvider {
  private readonly transport: TmdbTransport;
  private readonly mapper: TmdbSeriesMapper;

  constructor(config: TmdbConfig = getTmdbConfig()) {
    this.transport = new TmdbTransport(
      config,
      new Logger(TmdbSeriesProvider.name),
    );
    this.mapper = new TmdbSeriesMapper(config.imageBaseUrl);
  }

  async findOne(id: number): Promise<SeriesDetails | undefined> {
    const body = await this.transport.request({
      path: `/tv/${id}`,
      operation: 'series-details',
      allowNotFound: true,
      validateBody: (value) => validateTmdbSeriesDetails(value, id),
    });
    if (body === undefined) {
      return undefined;
    }

    validateTmdbSeriesDetails(body, id);
    return this.mapper.toSeriesDetails(body);
  }

  async findSeason(id: number, season: number) {
    const body = await this.transport.request({
      path: `/tv/${id}/season/${season}`,
      operation: 'series-season',
      allowNotFound: true,
      validateBody: (value) => validateTmdbSeason(value, id, season),
    });
    if (body === undefined) {
      return undefined;
    }
    validateTmdbSeason(body, id, season);
    return this.mapper.toSeasonDetails(body, id);
  }

  async findEpisode(id: number, season: number, episode: number) {
    // One bounded compound request. No automatic atomic fallback; recovery is explicit.
    const body = await this.transport.request({
      path: `/tv/${id}/season/${season}/episode/${episode}`,
      query: { append_to_response: 'credits' },
      operation: 'series-episode',
      allowNotFound: true,
      validateBody: (value) => validateTmdbEpisode(value, id, season, episode),
    });
    if (body === undefined) {
      return undefined;
    }
    validateTmdbEpisode(body, id, season, episode);
    return {
      ...this.mapper.toEpisodeSummary(body, id),
      credits: this.mapper.toEpisodeCredits(body.credits, body),
    };
  }

  async findEpisodeCredits(id: number, season: number, episode: number) {
    const body = await this.transport.request({
      path: `/tv/${id}/season/${season}/episode/${episode}/credits`,
      operation: 'series-episode-credits',
      allowNotFound: true,
      validateBody: (value) => {
        const record = seriesRecord(value);
        if (
          !record ||
          record.success === false ||
          !seriesPositiveId(record.id)
        ) {
          throw new Error('Invalid episode credits');
        }
      },
    });
    if (body === undefined) {
      return undefined;
    }
    return this.mapper.toEpisodeCredits(body);
  }
}
