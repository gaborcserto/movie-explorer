import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  MovieCollection,
  MovieCollectionResponse,
} from '@movie-explorer/contracts';

import { SearchMovieDto } from '../search/search.dto';

class MovieCollectionDto implements MovieCollection {
  @ApiProperty({
    type: 'integer',
    minimum: 1,
    maximum: Number.MAX_SAFE_INTEGER,
  })
  id: number;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  posterUrl?: string;

  @ApiPropertyOptional()
  backdropUrl?: string;
}

export class MovieCollectionResponseDto implements MovieCollectionResponse {
  @ApiProperty({ type: MovieCollectionDto, nullable: true })
  collection: MovieCollectionDto | null;

  @ApiProperty({
    type: [SearchMovieDto],
    description:
      'Other collection movies in release-date order; unknown dates last, ties by ID. No ten-title limit.',
  })
  results: SearchMovieDto[];

  @ApiProperty({
    enum: ['available', 'partial'],
    description:
      'Missing membership is available with a null collection and empty results. Partial means malformed parts were skipped.',
  })
  availability: MovieCollectionResponse['availability'];
}
