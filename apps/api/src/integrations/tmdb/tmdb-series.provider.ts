import { Injectable, Logger } from '@nestjs/common';
import type { SeriesDetails } from '@movie-explorer/contracts';

import type { SeriesProvider } from '../../series/series-provider';
import { getTmdbConfig, TmdbConfig } from './tmdb.config';
import { TmdbTransport } from './tmdb.transport';
import { TmdbSeriesMediaMapper } from './tmdb-series-media.mapper';
import { TmdbSeriesCreditsMapper } from './tmdb-series-credits.mapper';
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

  private readonly imageBaseUrl: string;
  private readonly language: string;

  constructor(config: TmdbConfig = getTmdbConfig()) {
    this.imageBaseUrl = config.imageBaseUrl;
    this.language = config.language;
    this.transport = new TmdbTransport(
      config,
      new Logger(TmdbSeriesProvider.name),
    );
    this.mapper = new TmdbSeriesMapper(config.imageBaseUrl);
  }

  async findOne(id: number): Promise<SeriesDetails | undefined> {
    const body = await this.transport.request({
      path: `/tv/${id}`,
      query: {
        append_to_response: 'aggregate_credits,images,videos',
        ...this.mediaLanguages(),
      },
      operation: 'series-details',
      allowNotFound: true,
      validateBody: (value) => validateTmdbSeriesDetails(value, id),
    });
    if (body === undefined) {
      return undefined;
    }

    validateTmdbSeriesDetails(body, id);
    return {
      ...this.mapper.toSeriesDetails(body),
      credits: new TmdbSeriesCreditsMapper(this.imageBaseUrl).map(
        this.appended(body.aggregate_credits, id),
      ),
      images: new TmdbSeriesMediaMapper(this.imageBaseUrl).images(
        this.appended(body.images, id),
      ),
      videos: new TmdbSeriesMediaMapper(this.imageBaseUrl).videos(
        this.appended(body.videos, id),
      ),
    };
  }

  private appended(value: unknown, parentId: number) {
    const row = seriesRecord(value);
    // TMDB omits IDs inside appended namespaces; the validated parent owns identity.
    return row &&
      row.success !== false &&
      (row.id === undefined || row.id === parentId)
      ? row
      : undefined;
  }

  private mediaLanguages() {
    const languages = [
      ...new Set([this.language.split('-')[0], 'en', 'null']),
    ].join(',');
    return {
      include_image_language: languages,
      include_video_language: languages,
    };
  }

  private async mediaSection(id: number, section: 'images' | 'videos') {
    return this.transport.request({
      path: `/tv/${id}/${section}`,
      query: this.mediaLanguages(),
      operation: `series-${section}`,
      allowNotFound: true,
      validateBody: (value) => {
        const row = seriesRecord(value);
        if (!row || row.success === false || row.id !== id) {
          throw new Error('Invalid series media identity');
        }
      },
    });
  }

  async findImages(id: number) {
    const body = await this.mediaSection(id, 'images');
    return body === undefined
      ? undefined
      : new TmdbSeriesMediaMapper(this.imageBaseUrl).images(body);
  }

  async findVideos(id: number) {
    const body = await this.mediaSection(id, 'videos');
    return body === undefined
      ? undefined
      : new TmdbSeriesMediaMapper(this.imageBaseUrl).videos(body);
  }

  async findCredits(id: number) {
    const body = await this.transport.request({
      path: `/tv/${id}/aggregate_credits`,
      operation: 'series-credits',
      allowNotFound: true,
      validateBody: (value) => {
        const row = seriesRecord(value);
        if (!row || row.success === false || row.id !== id) {
          throw new Error('Invalid series credits identity');
        }
      },
    });
    return body === undefined
      ? undefined
      : new TmdbSeriesCreditsMapper(this.imageBaseUrl).map(body);
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
