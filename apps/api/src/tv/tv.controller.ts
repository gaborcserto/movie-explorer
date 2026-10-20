import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
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
import type { TvSeriesDetails } from '@movie-explorer/contracts';

import { DetailIdParams } from '../validation/detail-id.dto';
import { TvSeriesDetailsDto } from './tv.dto';
import { TvService } from './tv.service';

@ApiTags('tv')
@Controller('api/v1/tv')
export class TvController {
  constructor(private readonly service: TvService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Get TV series details',
    description:
      'Normalized core series metadata and season summaries in the server-configured language.',
  })
  @ApiParam({
    name: 'id',
    description: 'Positive decimal safe integer TMDB TV series ID',
    schema: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
  })
  @ApiOkResponse({ type: () => TvSeriesDetailsDto })
  @ApiBadRequestResponse({ description: 'Invalid TV series ID' })
  @ApiNotFoundResponse({ description: 'TV series not found' })
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
  async getSeries(@Param() params: DetailIdParams): Promise<TvSeriesDetails> {
    const series = await this.service.findOne(params.id);
    if (!series) {
      throw new NotFoundException('TV series not found');
    }
    return series;
  }
}
