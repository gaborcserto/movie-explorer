import { BadGatewayException, Logger } from '@nestjs/common';
import type { SearchResponse, SearchType } from '@movie-explorer/contracts';

import type { SearchProvider } from '../../search/search-provider';
import { getTmdbConfig, TmdbConfig } from './tmdb.config';
import { TmdbTransport } from './tmdb.transport';
import { mapSearch, searchPage } from './tmdb-search.mapper';

export class TmdbSearchProvider implements SearchProvider {
  private readonly transport: TmdbTransport;

  constructor(private readonly config: TmdbConfig = getTmdbConfig()) {
    this.transport = new TmdbTransport(
      config,
      new Logger(TmdbSearchProvider.name),
    );
  }

  async find(
    query: string,
    type: SearchType,
    page: number,
    year?: number,
  ): Promise<SearchResponse> {
    const body = await this.transport.request({
      path: `/search/${type === 'all' ? 'multi' : type}`,
      operation: 'search',
      query: {
        query: query.trim(),
        include_adult: 'false',
        page: String(page),
        ...(year !== undefined && {
          [type === 'tv' ? 'first_air_date_year' : 'primary_release_year']:
            String(year),
        }),
      },
      validateBody: (value) => {
        if (searchPage(value).page !== page) {
          throw new BadGatewayException('Search provider response was invalid');
        }
      },
    });
    return mapSearch(body, type, this.config.imageBaseUrl);
  }
}
