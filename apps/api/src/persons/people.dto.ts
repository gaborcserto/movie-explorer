import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import type {
  PersonListResponse,
  PersonSummary,
} from '@movie-explorer/contracts';

export class GetPeopleQuery {
  @ApiProperty({ minLength: 1, maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  query: string;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 500 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  page: number = 1;
}

export class PersonListingQuery extends PickType(GetPeopleQuery, ['page']) {
  @ApiPropertyOptional({
    maxLength: 100,
    description: 'Name search; omit for popular persons',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(100)
  query: string = '';
}

export class PersonSummaryDto implements PersonSummary {
  @ApiProperty({ minimum: 1 }) id: number;
  @ApiProperty() name: string;
  @ApiPropertyOptional() profileUrl?: string;
  @ApiPropertyOptional() knownForDepartment?: string;
}

export class PersonListResponseDto implements PersonListResponse {
  @ApiProperty({ type: [PersonSummaryDto] }) people: PersonSummary[];
  @ApiProperty({ minimum: 1, maximum: 500 }) page: number;
  @ApiProperty({ minimum: 0, maximum: 500 }) totalPages: number;
  @ApiProperty({
    minimum: 0,
    description: 'Provider count before invalid or adult records are removed',
  })
  totalResults: number;
}
