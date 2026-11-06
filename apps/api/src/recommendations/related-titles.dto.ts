import { ApiExtraModels, ApiProperty, PickType } from '@nestjs/swagger';
import type { RelatedTitlesResponse } from '@movie-explorer/contracts';

import { RecommendationResponseDto } from './recommendations.dto';
import { SearchMovieDto, SearchSeriesDto } from '../search/search.dto';

@ApiExtraModels(SearchMovieDto, SearchSeriesDto)
export class RelatedTitlesResponseDto
  extends PickType(RecommendationResponseDto, ['results'] as const)
  implements RelatedTitlesResponse
{
  @ApiProperty({
    enum: ['available', 'partial'],
    description:
      'Available includes empty sources. Partial means source data or ranking metadata was unavailable or malformed. Complete failure is an HTTP error.',
  })
  availability: RelatedTitlesResponse['availability'];
}
