import { ApiProperty, PickType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import type {
  RecommendationCategory,
  RecommendationResponse,
  PersonalizedRecommendationRequest,
  PersonalizedRecommendationResponse,
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

export class PersonalizedRecommendationBody implements PersonalizedRecommendationRequest {
  @ApiProperty({ enum: ['movie', 'tv'] })
  @IsIn(['movie', 'tv'])
  mediaType: 'movie' | 'tv';

  @ApiProperty({
    type: 'array',
    items: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
    maxItems: 3,
    uniqueItems: true,
    description:
      'Up to three deterministic Favorite seed IDs of the selected media type. Positive safe integers.',
  })
  @IsArray()
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(Number.MAX_SAFE_INTEGER, { each: true })
  favoriteIds: number[];

  @ApiProperty({
    type: 'array',
    items: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
    maxItems: 1000,
    uniqueItems: true,
    description:
      'Favorites and Watched IDs of the selected media type. Seeds are excluded implicitly. Positive safe integers.',
  })
  @IsArray()
  @ArrayMaxSize(1000)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(Number.MAX_SAFE_INTEGER, { each: true })
  excludedIds: number[];
}

export class PersonalizedRecommendationResponseDto
  extends PickType(RecommendationResponseDto, [
    'results',
    'availability',
  ] as const)
  implements PersonalizedRecommendationResponse
{
  @ApiProperty({
    enum: ['available', 'partial'],
    description:
      'Partial means at least one Similar or Popular source failed or was malformed, even when fallback fills all ten slots. Complete failure preserves classified HTTP errors.',
  })
  availability: PersonalizedRecommendationResponse['availability'];

  @ApiProperty({ enum: ['movie', 'tv'] })
  mediaType: 'movie' | 'tv';

  @ApiProperty({
    enum: ['favorites', 'mixed', 'popular'],
    description:
      'Favorites-based titles, Favorites plus Popular fill, or Popular only. Partial availability discloses any failed source even when fallback fills all slots.',
  })
  source: PersonalizedRecommendationResponse['source'];
}
