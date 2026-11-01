import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type {
  RecommendationCategory,
  RecommendationResponse,
} from '@movie-explorer/contracts';

const categories: RecommendationCategory[] = [
  'popular-movies',
  'top-rated-movies',
  'popular-series',
  'top-rated-series',
];

export class RecommendationParams {
  @ApiProperty({ enum: categories })
  @IsIn(categories)
  category: RecommendationCategory;
}

export class RecommendationResponseDto implements RecommendationResponse {
  @ApiProperty({ enum: categories })
  category: RecommendationCategory;

  @ApiProperty({
    type: 'array',
    maxItems: 10,
    items: {
      oneOf: [
        { $ref: '#/components/schemas/SearchMovieDto' },
        { $ref: '#/components/schemas/SearchSeriesDto' },
      ],
      discriminator: {
        propertyName: 'mediaType',
        mapping: {
          movie: '#/components/schemas/SearchMovieDto',
          tv: '#/components/schemas/SearchSeriesDto',
        },
      },
    },
  })
  results: RecommendationResponse['results'];

  @ApiProperty({
    enum: ['available', 'partial'],
    description:
      'Available includes empty sources. Partial means some source pages failed; partial pools are not cached. Complete failure is an HTTP error.',
  })
  availability: RecommendationResponse['availability'];

  @ApiProperty({
    type: 'integer',
    minimum: 0,
    maximum: 100,
    description:
      'Valid unique candidates from at most the first five source pages, not an upstream total or a guarantee of 100 titles.',
  })
  candidateCount: number;
}
