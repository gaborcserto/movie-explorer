import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiGatewayTimeoutResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type { RecommendationResponse } from '@movie-explorer/contracts';

import {
  RecommendationParams,
  RecommendationResponseDto,
} from './recommendations.dto';
import { RecommendationsService } from './recommendations.service';
import { SearchMovieDto, SearchSeriesDto } from '../search/search.dto';

@ApiTags('Recommendations')
@ApiExtraModels(SearchMovieDto, SearchSeriesDto)
@ApiBadRequestResponse({ description: 'Invalid category or unsupported query' })
@ApiBadGatewayResponse({
  description: 'Provider failure or malformed response',
})
@ApiGatewayTimeoutResponse({ description: 'Provider deadline exceeded' })
@ApiTooManyRequestsResponse({ description: 'Provider rate limit reached' })
@Controller('api/v1/recommendations')
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  @Get(':category')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Sample up to ten unique Movie or Series recommendations',
    description:
      'Samples from up to 100 unique candidates in the first five ranked source pages. Pools are cached for 30 minutes per category and configured locale/region. Each request samples again. No personalization, public query parameters or pagination. Partial results are explicitly marked and not cached.',
  })
  @ApiOkResponse({ type: RecommendationResponseDto })
  find(
    @Param() params: RecommendationParams,
    @Query() query: Record<string, unknown>,
  ): Promise<RecommendationResponse> {
    if (Object.keys(query).length) {
      throw new BadRequestException(
        'Recommendation query parameters are not supported',
      );
    }

    return this.service.find(params.category);
  }
}
