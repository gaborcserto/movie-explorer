import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type {
  ImdbRating,
  ImdbRatingResponse,
  RatingResult,
} from '@movie-explorer/contracts';

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

export class AvailableRatingDto {
  @ApiProperty({ enum: ['available'] }) status: 'available';
  @ApiProperty({ minimum: 0, maximum: 10 }) score: number;
  @ApiProperty({ nullable: true, minimum: 0, type: Number }) voteCount:
    | number
    | null;
}

export class MissingRatingDto {
  @ApiProperty({ enum: ['missing'], example: 'missing' }) status: 'missing';
}

export class UnavailableRatingDto {
  @ApiProperty({ enum: ['unavailable'], example: 'unavailable' })
  status: 'unavailable';
  @ApiProperty({
    enum: ['timeout', 'upstream-error', 'invalid-response', 'not-configured'],
    example: 'upstream-error',
  })
  reason: 'timeout' | 'upstream-error' | 'invalid-response' | 'not-configured';
  @ApiProperty({ required: false, minimum: 1 }) retryAfterSeconds?: number;
}

const ratingSchema = {
  oneOf: [
    { $ref: getSchemaPath(AvailableRatingDto) },
    { $ref: getSchemaPath(MissingRatingDto) },
    { $ref: getSchemaPath(UnavailableRatingDto) },
  ],
  discriminator: { propertyName: 'status' },
};

@ApiExtraModels(AvailableRatingDto, MissingRatingDto, UnavailableRatingDto)
export class RatingsDto {
  @ApiProperty({
    ...ratingSchema,
    example: { status: 'available', score: 7.8, voteCount: 12500 },
    description: 'TMDB rating outcome',
  })
  tmdb: RatingResult;

  @ApiProperty({
    ...ratingSchema,
    example: { status: 'available', score: 8.1, voteCount: 98000 },
    description: 'IMDb rating outcome',
  })
  imdb: RatingResult;
}
