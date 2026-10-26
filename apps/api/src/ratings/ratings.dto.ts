import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { ImdbRating, ImdbRatingResponse } from '@movie-explorer/contracts';
import { DetailIdParams } from '../validation/detail-id.dto';

export class RatingParams extends DetailIdParams {
  @ApiProperty({ enum: ['movie', 'series'] })
  @IsIn(['movie', 'series'])
  mediaType: 'movie' | 'series';
}

export class ImdbRatingDto implements ImdbRating {
  @ApiProperty({ minimum: 0, maximum: 10 })
  score: number;

  @ApiProperty({ type: Number, nullable: true, minimum: 0 })
  voteCount: number | null;
}

export class ImdbRatingResponseDto implements ImdbRatingResponse {
  @ApiProperty({ type: ImdbRatingDto, nullable: true })
  imdb: ImdbRatingDto | null;
}
