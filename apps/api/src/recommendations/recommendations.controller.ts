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

import { LocalizationQuery } from '../localization.dto';
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
      'At most three seeds, one Similar page each with a six-second ceiling. Each seed also uses cached source metadata or one parallel lookup capped at 1.5 seconds (at most six concurrent upstream calls). Genre, rating confidence and source relevance determine stable ranking. Favorites and Watched are excluded. Popular fills remaining slots using seed relevance. No final response cache or automatic retries. No preference logging or persistence. Unknown body fields and query parameters are rejected.',
  })
  @ApiOkResponse({ type: PersonalizedRecommendationResponseDto })
  @ApiNotFoundResponse({
    description:
      'Favorite seeds were unavailable and no fallback could be returned',
  })
  personalize(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: PersonalizedRecommendationBody,
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: LocalizationQuery,
  ): Promise<PersonalizedRecommendationResponse> {
    if (
      Object.keys(query).some(
        (key) => key !== 'language' && key !== 'watchRegion',
      )
    ) {
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
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: LocalizationQuery,
  ): Promise<RecommendationResponse> {
    if (
      Object.keys(query).some(
        (key) => key !== 'language' && key !== 'watchRegion',
      )
    ) {
      throw new BadRequestException(
        'Recommendation query parameters are not supported',
      );
    }

    return this.service.find(params.category);
  }
}
