import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiBadRequestResponse,
  ApiBadGatewayResponse,
  ApiGatewayTimeoutResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type { SearchSuggestionsResponse } from '@movie-explorer/contracts';
import { GetMovieSuggestionsQuery } from '../movies/movies.dto';
import { SearchService } from './search.service';

@ApiTags('Search')
@ApiBadRequestResponse({ description: 'Invalid search query or limit' })
@ApiBadGatewayResponse({ description: 'Search providers failed' })
@ApiGatewayTimeoutResponse({ description: 'Provider deadline exceeded' })
@ApiTooManyRequestsResponse({ description: 'Provider rate limit reached' })
@Controller('api/v1/search')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  // Intentionally public autocomplete.
  // nestjs-doctor-ignore-next-line security/require-guards-on-endpoints
  @Get('suggestions')
  @ApiOperation({
    summary: 'Get grouped movie and person suggestions (limit per group)',
  })
  suggestions(
    @Query() query: GetMovieSuggestionsQuery,
  ): Promise<SearchSuggestionsResponse> {
    return this.service.suggestions(query.query.trim(), query.limit ?? 6);
  }
}
