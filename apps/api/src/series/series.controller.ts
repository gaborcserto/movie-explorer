import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiBadGatewayResponse,
  ApiGatewayTimeoutResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type { SeriesDetails } from '@movie-explorer/contracts';

import { WatchProvidersDto } from '../movies/watch-providers.dto';
import { DetailIdParams } from '../validation/detail-id.dto';
import {
  SeriesDetailsDto,
  SeriesCreditsDto,
  SeriesImagesDto,
  SeriesVideosDto,
  SeasonDetailsDto,
  EpisodeDetailsDto,
  EpisodeCreditsDto,
} from './series.dto';
import { SeasonParams, EpisodeParams } from './series-params.dto';
import { SeriesListQuery } from './series-list.dto';
import { SearchResponseDto } from '../search/search.dto';
import { SeriesService } from './series.service';

@ApiTags('Series')
@ApiBadRequestResponse({
  description:
    'IDs and episode numbers: decimal integers 1..MAX_SAFE_INTEGER; season numbers: 0..MAX_SAFE_INTEGER',
})
@ApiNotFoundResponse({
  description: 'Requested series, season or episode not found',
})
@ApiBadGatewayResponse({
  description: 'Provider failure or malformed response',
})
@ApiGatewayTimeoutResponse({ description: 'Provider deadline exceeded' })
@ApiTooManyRequestsResponse({
  description: 'Provider rate limit reached',
  headers: {
    'Retry-After': { schema: { type: 'integer', minimum: 1, maximum: 86400 } },
  },
})
@Controller('api/v1/series')
export class SeriesController {
  constructor(private readonly service: SeriesService) {}

  @Get()
  @ApiOperation({
    summary:
      'Browse Series by popularity, first-air year, minimum rating and sort order',
    description:
      'One discover page per request. Counts are provider totals; accessible pages are capped at 500. Results have mediaType tv.',
  })
  @ApiOkResponse({ type: SearchResponseDto })
  findPopular(@Query() query: SeriesListQuery) {
    return this.service.findPopular(query);
  }

  @Get(':id/seasons/:seasonNumber')
  @ApiOperation({
    summary: 'Get season metadata and ordered episode summaries',
  })
  @ApiOkResponse({ type: () => SeasonDetailsDto })
  async getSeason(@Param() params: SeasonParams) {
    const season = await this.service.findSeason(
      params.id,
      params.seasonNumber,
    );
    if (!season) {
      throw new NotFoundException('TV season not found');
    }
    return season;
  }

  @Get(':id/seasons/:seasonNumber/episodes/:episodeNumber/credits')
  @ApiOperation({
    summary: 'Recover episode credits with independent category availability',
  })
  @ApiOkResponse({ type: () => EpisodeCreditsDto })
  async getEpisodeCredits(@Param() params: EpisodeParams) {
    const credits = await this.service.findEpisodeCredits(
      params.id,
      params.seasonNumber,
      params.episodeNumber,
    );
    if (!credits) {
      throw new NotFoundException('TV episode not found');
    }
    return credits;
  }

  @Get(':id/seasons/:seasonNumber/episodes/:episodeNumber')
  @ApiOperation({
    summary: 'Get episode details and available episode credits',
  })
  @ApiOkResponse({ type: () => EpisodeDetailsDto })
  async getEpisode(@Param() params: EpisodeParams) {
    const episode = await this.service.findEpisode(
      params.id,
      params.seasonNumber,
      params.episodeNumber,
    );
    if (!episode) {
      throw new NotFoundException('TV episode not found');
    }
    return episode;
  }

  @Get(':id/images')
  @ApiOperation({
    summary:
      'Get series posters and backdrops; localized, English and untagged images',
  })
  @ApiParam({
    name: 'id',
    schema: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
  })
  @ApiOkResponse({ type: SeriesImagesDto })
  async getImages(@Param() params: DetailIdParams) {
    const images = await this.service.findImages(params.id);
    if (!images) {
      throw new NotFoundException('TV series not found');
    }
    return images;
  }

  @Get(':id/videos')
  @ApiOperation({ summary: 'Get series videos with independent availability' })
  @ApiParam({
    name: 'id',
    schema: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
  })
  @ApiOkResponse({ type: SeriesVideosDto })
  async getVideos(@Param() params: DetailIdParams) {
    const videos = await this.service.findVideos(params.id);
    if (!videos) {
      throw new NotFoundException('TV series not found');
    }
    return videos;
  }

  @Get(':id/watch-providers')
  @ApiOperation({ summary: 'Get Hungarian streaming, rent and buy providers' })
  @ApiParam({
    name: 'id',
    schema: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
  })
  @ApiOkResponse({ type: WatchProvidersDto })
  async getWatchProviders(@Param() params: DetailIdParams) {
    const providers = await this.service.findWatchProviders(params.id);
    if (!providers) {
      throw new NotFoundException('TV series not found');
    }
    return providers;
  }

  @Get(':id/credits')
  @ApiOperation({
    summary:
      'Get whole-series aggregate credits with independent cast/crew availability',
  })
  @ApiParam({
    name: 'id',
    schema: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
  })
  @ApiOkResponse({ type: SeriesCreditsDto })
  async getCredits(@Param() params: DetailIdParams) {
    const credits = await this.service.findCredits(params.id);
    if (!credits) {
      throw new NotFoundException('TV series not found');
    }
    return credits;
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get series details',
    description:
      'Normalized core series metadata and season summaries in the server-configured language.',
  })
  @ApiParam({
    name: 'id',
    description: 'Positive decimal safe integer TMDB series ID',
    schema: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
  })
  @ApiOkResponse({ type: () => SeriesDetailsDto })
  @ApiBadRequestResponse({ description: 'Invalid series ID' })
  @ApiNotFoundResponse({ description: 'Series not found' })
  @ApiBadGatewayResponse({
    description:
      'Provider connection, authorization or upstream failure, or invalid response',
  })
  @ApiTooManyRequestsResponse({
    description: 'Provider rate limit reached',
    headers: {
      'Retry-After': {
        description:
          'Safe retry delay in seconds when supplied by the provider',
        schema: { type: 'integer', minimum: 1, maximum: 86400 },
      },
    },
  })
  @ApiGatewayTimeoutResponse({
    description: 'Provider request deadline exceeded',
  })
  async getSeries(@Param() params: DetailIdParams): Promise<SeriesDetails> {
    const series = await this.service.findOne(params.id);
    if (!series) {
      throw new NotFoundException('TV series not found');
    }
    return series;
  }
}
