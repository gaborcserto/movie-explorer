import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { RatingsService } from './ratings.service';
import { ImdbRatingResponseDto, RatingParams } from './ratings.dto';

@ApiTags('Ratings')
@Controller('api/v1/ratings')
export class RatingsController {
  constructor(private readonly service: RatingsService) {}

  @Get(':mediaType/:id/imdb')
  @ApiOperation({
    summary:
      'Optional IMDb rating via OMDb; unavailable data returns imdb: null',
  })
  @ApiOkResponse({ type: ImdbRatingResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid media type or TMDB ID' })
  getImdb(@Param() params: RatingParams) {
    return this.service.findImdb(params.mediaType, params.id);
  }
}
