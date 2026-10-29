import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { SearchResponse, SearchType } from '@movie-explorer/contracts';

import { GetPeopleQuery } from '../persons/people.dto';
import { GetMovieSuggestionsQuery } from '../movies/movies.dto';

export class SearchQuery extends GetPeopleQuery {
  @ApiPropertyOptional({
    enum: ['all', 'movie', 'tv', 'person'],
    default: 'all',
  })
  @IsIn(['all', 'movie', 'tv', 'person'])
  type: SearchType = 'all';

  @ApiPropertyOptional({
    minimum: 1874,
    maximum: 9999,
    description:
      'Movie release year or Series first-air year. Rejected for All and Persons.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1874)
  @Max(9999)
  year?: number;
}

export class SearchSuggestionsQuery extends GetMovieSuggestionsQuery {
  @ApiPropertyOptional({
    default: false,
    description:
      'Include a Series group, retaining the existing per-group limit.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  includeSeries?: boolean;
}

export class SearchMovieDto {
  @ApiProperty({ enum: ['movie'] })
  mediaType: 'movie';
  @ApiProperty({ type: 'integer', minimum: 1 })
  id: number;
  @ApiProperty()
  title: string;
  @ApiPropertyOptional()
  posterUrl?: string;
  @ApiPropertyOptional()
  backdropUrl?: string;
  @ApiPropertyOptional({ format: 'date' })
  releaseDate?: string;
  @ApiPropertyOptional({ type: 'integer' })
  releaseYear?: number;
  @ApiPropertyOptional()
  description?: string;
  @ApiPropertyOptional({ minimum: 0 })
  popularity?: number;
  @ApiPropertyOptional({ minimum: 0, maximum: 10 })
  rating?: number;
}

export class SearchSeriesDto {
  @ApiProperty({ enum: ['tv'] })
  mediaType: 'tv';
  @ApiProperty({ type: 'integer', minimum: 1 })
  id: number;
  @ApiProperty()
  title: string;
  @ApiPropertyOptional()
  posterUrl?: string;
  @ApiPropertyOptional()
  backdropUrl?: string;
  @ApiPropertyOptional({ format: 'date' })
  firstAirDate?: string;
  @ApiPropertyOptional()
  description?: string;
  @ApiPropertyOptional({ minimum: 0 })
  popularity?: number;
  @ApiPropertyOptional({ minimum: 0, maximum: 10 })
  rating?: number;
}

export class SearchPersonDto {
  @ApiProperty({ enum: ['person'] })
  mediaType: 'person';
  @ApiProperty({ type: 'integer', minimum: 1 })
  id: number;
  @ApiProperty()
  name: string;
  @ApiPropertyOptional()
  profileUrl?: string;
  @ApiPropertyOptional()
  knownForDepartment?: string;
  @ApiPropertyOptional({ minimum: 0 })
  popularity?: number;
}

export const searchResultSchema = {
  oneOf: ['SearchMovieDto', 'SearchSeriesDto', 'SearchPersonDto'].map(
    (name) => ({ $ref: `#/components/schemas/${name}` }),
  ),
  discriminator: {
    propertyName: 'mediaType',
    mapping: {
      movie: '#/components/schemas/SearchMovieDto',
      tv: '#/components/schemas/SearchSeriesDto',
      person: '#/components/schemas/SearchPersonDto',
    },
  },
};

export class SearchResponseDto implements SearchResponse {
  @ApiProperty({ type: 'array', items: searchResultSchema })
  results: SearchResponse['results'];
  @ApiProperty({ minimum: 1, maximum: 500 })
  page: number;
  @ApiProperty({ minimum: 0, maximum: 500 })
  totalPages: number;
  @ApiProperty({
    minimum: 0,
    description:
      'Upstream total before adult/invalid-record removal or client deduplication; not the number of renderable cards.',
  })
  totalResults: number;
}
