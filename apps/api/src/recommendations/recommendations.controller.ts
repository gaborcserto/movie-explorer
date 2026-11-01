import {
  BadRequestException,
  Body,
  Post,
  HttpCode,
  ValidationPipe,
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
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type {
  PersonalizedRecommendationResponse,
  RecommendationResponse,
} from '@movie-explorer/contracts';

import {
  PersonalizedRecommendationBody,
  PersonalizedRecommendationResponseDto,
  RecommendationParams,
  RecommendationResponseDto,
} from './recommendations.dto';
import { RecommendationsService } from './recommendations.service';
import { SearchMovieDto, SearchSeriesDto } from '../search/search.dto';

@ApiTags('Recommendations')
@ApiExtraModels(SearchMovieDto, SearchSeriesDto)
@ApiBadRequestResponse({
  description: 'Invalid category, preference payload or unsupported query',
})
@ApiBadGatewayResponse({
  description: 'Provider failure or malformed response',
})
@ApiGatewayTimeoutResponse({ description: 'Provider deadline exceeded' })
@ApiTooManyRequestsResponse({ description: 'Provider rate limit reached' })
@Controller('api/v1/recommendations')
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  @Post('personalized')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Recommend titles using bounded Favorite IDs',
    description:
      'At most three seeds, one Similar page each, up to three parallel calls with a six-second per-call ceiling. Favorites and Watched are excluded. Popular fills up to ten eligible titles. No final response cache or automatic retries. No preference logging or persistence. Unknown body fields and query parameters are rejected.',
  })
  @ApiOkResponse({ type: PersonalizedRecommendationResponseDto })
  @ApiNotFoundResponse({
    description:
      'Favorite seeds were unavailable and no fallback could be returned',
  })
  personalize(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: PersonalizedRecommendationBody,
    @Query() query: Record<string, unknown>,
  ): Promise<PersonalizedRecommendationResponse> {
    if (Object.keys(query).length) {
      throw new BadRequestException(
        'Recommendation query parameters are not supported',
      );
    }

    return this.service.personalize(body);
  }

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
