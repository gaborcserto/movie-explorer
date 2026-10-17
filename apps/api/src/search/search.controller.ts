import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { SearchSuggestionsResponse } from '@movie-explorer/contracts';
import { GetMovieSuggestionsQuery } from '../movies/movies.dto';
import { SearchService } from './search.service';

@ApiTags('search')
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
