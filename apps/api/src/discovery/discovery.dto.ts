import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  DiscoverySection,
  StreamingProviderInfo,
} from '@movie-explorer/contracts';

export class DiscoveryParams {
  @ApiProperty({
    enum: [
      'trending',
      'new-movies',
      'new-series',
      'popular-movies',
      'popular-series',
      'cinema',
      'coming-soon',
      'streaming-movies',
      'streaming-series',
    ],
  })
  @IsIn([
    'trending',
    'new-movies',
    'new-series',
    'popular-movies',
    'popular-series',
    'cinema',
    'coming-soon',
    'streaming-movies',
    'streaming-series',
  ])
  section: DiscoverySection;
}

export class DiscoveryQuery {
  @ApiPropertyOptional({ minimum: 1, maximum: 500, default: 1 })
  @Type(() => Number)
  @Min(1)
  @Max(500)
  @IsInt()
  page = 1;
}

export class StreamingProviderQuery {
  @ApiPropertyOptional({ default: 'HU', minLength: 2, maxLength: 2 })
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/)
  region = 'HU';
}

export class StreamingDiscoveryQuery extends DiscoveryQuery {
  @ApiPropertyOptional({ default: 'HU', minLength: 2, maxLength: 2 })
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/)
  region = 'HU';
}

export class StreamingProviderParams {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @Min(1)
  @IsInt()
  providerId: number;
}

export class StreamingProviderInfoDto implements StreamingProviderInfo {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}
