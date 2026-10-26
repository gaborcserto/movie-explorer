import { Injectable, Logger } from '@nestjs/common';
import type { SeriesDetails } from '@movie-explorer/contracts';

import { TmdbExternalIds } from './tmdb-external-ids';
import { mapWatchProviders } from './tmdb-watch-providers.mapper';
import type { SeriesListQuery } from '../../series/series-list.dto';
import { mapSearch, searchPage } from './tmdb-search.mapper';
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

  constructor(
    config: TmdbConfig = getTmdbConfig(),
    private readonly externalIds?: TmdbExternalIds,
  ) {
    this.imageBaseUrl = config.imageBaseUrl;
    this.language = config.language;
    this.transport = new TmdbTransport(
      config,
      new Logger(TmdbSeriesProvider.name),
    );
    this.mapper = new TmdbSeriesMapper(config.imageBaseUrl);
  }

  async findPopular(query: SeriesListQuery) {
    const sortFields = {
      popularity: 'popularity',
      firstAirDate: 'first_air_date',
      rating: 'vote_average',
      title: 'name',
    };
    const body = await this.transport.request({
      path: '/discover/tv',
      operation: 'series-list',
      query: {
        page: String(query.page),
        include_adult: 'false',
        sort_by: `${sortFields[query.sort]}.${query.order}`,
        ...(query.year !== undefined && {
          'first_air_date.gte': `${query.year}-01-01`,
          'first_air_date.lte': `${query.year}-12-31`,
        }),
        ...(query.minimumRating !== undefined && {
          'vote_average.gte': String(query.minimumRating),
        }),
      },
      validateBody: (value) => {
        if (searchPage(value).page !== query.page) {
          throw new Error('Invalid series listing page');
        }
      },
    });
    return mapSearch(body, 'tv', this.imageBaseUrl);
  }

  async findOne(id: number): Promise<SeriesDetails | undefined> {
    const body = await this.transport.request({
      path: `/tv/${id}`,
      query: {
        append_to_response: 'aggregate_credits,images,videos,external_ids',
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
    const external = seriesRecord(body.external_ids);
    if (
      external &&
      external.success !== false &&
      (external.id === undefined || external.id === id)
    ) {
      this.externalIds?.remember('series', id, external.imdb_id);
    }
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

  async findWatchProviders(id: number) {
    const body = await this.transport.request({
      path: `/tv/${id}/watch/providers`,
      operation: 'series-watch-providers',
      allowNotFound: true,
      validateBody: (value) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          throw new Error('Invalid watch providers');
        }
      },
    });
    return mapWatchProviders(body, this.imageBaseUrl);
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
