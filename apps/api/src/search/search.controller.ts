import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiBadRequestResponse,
  ApiBadGatewayResponse,
  ApiGatewayTimeoutResponse,
  ApiTooManyRequestsResponse,
  ApiExtraModels,
  ApiOkResponse,
} from '@nestjs/swagger';
import type { SearchSuggestionsResponse } from '@movie-explorer/contracts';
import { SearchService } from './search.service';
import { SectionAvailabilityDto } from '../validation/section-availability.dto';
import {
  SearchQuery,
  SearchSuggestionsQuery,
  SearchResponseDto,
  SearchMovieDto,
  SearchSeriesDto,
  SearchPersonDto,
  searchResultSchema,
} from './search.dto';

@ApiExtraModels(
  SearchMovieDto,
  SearchSeriesDto,
  SearchPersonDto,
  SectionAvailabilityDto,
)
@ApiTags('Search')
@ApiBadRequestResponse({ description: 'Invalid search query or limit' })
@ApiBadGatewayResponse({ description: 'Search providers failed' })
@ApiGatewayTimeoutResponse({ description: 'Provider deadline exceeded' })
@ApiTooManyRequestsResponse({ description: 'Provider rate limit reached' })
@Controller('api/v1/search')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  // Intentionally public unified text search.
  // nestjs-doctor-ignore-next-line security/require-guards-on-endpoints
  @Get()
  @ApiOperation({
    summary: 'Search Movies, Series and Persons in provider relevance order',
    description:
      'One upstream page per request. All uses multi-search; typed modes use their matching search. No custom sorting, genre or rating filters. Totals are upstream counts; accessible pages are capped at 500.',
  })
  @ApiOkResponse({ type: SearchResponseDto })
  find(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: SearchQuery,
  ) {
    return this.service.find(query.query, query.type, query.page, query.year);
  }

  // Intentionally public autocomplete.
  // nestjs-doctor-ignore-next-line security/require-guards-on-endpoints
  @Get('suggestions')
  @ApiOperation({
    summary:
      'Get grouped Movie, optional Series, and Person suggestions (limit per group)',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      required: ['suggestions'],
      properties: {
        suggestions: { type: 'array', items: searchResultSchema },
        groups: {
          type: 'object',
          properties: Object.fromEntries(
            ['movie', 'tv', 'person'].map((type) => [
              type,
              { $ref: '#/components/schemas/SectionAvailabilityDto' },
            ]),
          ),
        },
      },
    },
  })
  suggestions(
    @Query() query: SearchSuggestionsQuery,
  ): Promise<SearchSuggestionsResponse> {
    return this.service.suggestions(
      query.query.trim(),
      query.limit ?? 6,
      query.includeSeries,
    );
  }
}
