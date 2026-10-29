import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiGatewayTimeoutResponse,
} from '@nestjs/swagger';
import type {
  SearchResponse,
  StreamingProviderInfo,
} from '@movie-explorer/contracts';

import {
  DiscoveryParams,
  DiscoveryQuery,
  StreamingDiscoveryQuery,
  StreamingProviderInfoDto,
  StreamingProviderParams,
  StreamingProviderQuery,
} from './discovery.dto';
import { DiscoveryService } from './discovery.service';
import { SearchResponseDto } from '../search/search.dto';

@ApiTags('Discover')
@ApiBadRequestResponse({ description: 'Unknown discovery section' })
@ApiBadGatewayResponse({
  description: 'Provider failure or malformed response',
})
@ApiGatewayTimeoutResponse({ description: 'Provider deadline exceeded' })
@ApiTooManyRequestsResponse({ description: 'Provider rate limit reached' })
@Controller('api/v1/discover')
export class DiscoveryController {
  constructor(private readonly service: DiscoveryService) {}

  @Get('providers')
  @ApiOperation({ summary: 'List streaming providers available in a region' })
  @ApiOkResponse({ type: StreamingProviderInfoDto, isArray: true })
  findStreamingProviders(
    @Query() query: StreamingProviderQuery,
  ): Promise<StreamingProviderInfo[]> {
    return this.service.findStreamingProviders(query.region);
  }

  @Get('streaming/:providerId')
  @ApiOperation({ summary: 'Discover movies and series on a provider' })
  @ApiOkResponse({ type: SearchResponseDto })
  findStreaming(
    @Param() params: StreamingProviderParams,
    @Query() query: StreamingDiscoveryQuery,
  ): Promise<SearchResponse> {
    return this.service.findStreaming(
      params.providerId,
      query.region,
      query.page,
    );
  }

  @Get(':section')
  @ApiOperation({ summary: 'Get a normalized movie or series discovery feed' })
  @ApiOkResponse({ type: SearchResponseDto })
  find(
    @Param() params: DiscoveryParams,
    @Query() query: DiscoveryQuery,
  ): Promise<SearchResponse> {
    return this.service.find(params.section, query.page);
  }
}
