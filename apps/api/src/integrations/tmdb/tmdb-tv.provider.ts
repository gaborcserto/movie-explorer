import { Injectable, Logger } from '@nestjs/common';
import type { TvSeriesDetails } from '@movie-explorer/contracts';

import type { TvProvider } from '../../tv/tv-provider';
import { getTmdbConfig, TmdbConfig } from './tmdb.config';
import { TmdbTransport } from './tmdb.transport';
import { TmdbTvMapper } from './tmdb-tv.mapper';
import { validateTmdbTvDetails } from './tmdb-tv.validation';

@Injectable()
export class TmdbTvProvider implements TvProvider {
  private readonly transport: TmdbTransport;
  private readonly mapper: TmdbTvMapper;

  constructor(config: TmdbConfig = getTmdbConfig()) {
    this.transport = new TmdbTransport(config, new Logger(TmdbTvProvider.name));
    this.mapper = new TmdbTvMapper(config.imageBaseUrl);
  }

  async findOne(id: number): Promise<TvSeriesDetails | undefined> {
    const body = await this.transport.request({
      path: `/tv/${id}`,
      operation: 'tv-details',
      allowNotFound: true,
      validateBody: (value) => validateTmdbTvDetails(value, id),
    });
    if (body === undefined) {
      return undefined;
    }

    validateTmdbTvDetails(body, id);
    return this.mapper.toSeriesDetails(body);
  }
}
