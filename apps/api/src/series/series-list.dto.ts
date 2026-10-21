import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional, PickType } from '@nestjs/swagger';

import { GetPeopleQuery } from '../persons/people.dto';

export class SeriesListQuery extends PickType(GetPeopleQuery, ['page']) {
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
