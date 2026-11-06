import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional, PickType } from '@nestjs/swagger';

import type { SeriesGenre } from '@movie-explorer/contracts';

import type { SeriesProviderQuery } from './series-provider';
import { GetPeopleQuery } from '../persons/people.dto';

const seriesGenres = [
  'action & adventure',
  'animation',
  'comedy',
  'crime',
  'documentary',
  'drama',
  'family',
  'kids',
  'mystery',
  'news',
  'reality',
  'sci-fi & fantasy',
  'soap',
  'talk',
  'war & politics',
  'western',
] satisfies SeriesGenre[];

export class SeriesListQuery
  extends PickType(GetPeopleQuery, ['page'])
  implements SeriesProviderQuery
{
  @ApiPropertyOptional({
    enum: seriesGenres,
    isArray: true,
    description:
      'Series browse genres; comma-separated values use AND matching',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return value.split(',').map((genre) => genre.trim());
    }

    // Repeated query keys must fail array validation; accept one CSV value only.
    return Array.isArray(value) ? value.join(',') : value;
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(seriesGenres, { each: true })
  genre?: SeriesGenre[];

  @ApiPropertyOptional({ minimum: 1874, maximum: 9999 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1874)
  @Max(9999)
  year?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  minimumRating?: number;

  @ApiPropertyOptional({
    enum: ['popularity', 'firstAirDate', 'rating', 'title'],
    default: 'popularity',
  })
  @IsIn(['popularity', 'firstAirDate', 'rating', 'title'])
  sort: 'popularity' | 'firstAirDate' | 'rating' | 'title' = 'popularity';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}
