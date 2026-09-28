import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  MovieDetails as MovieDetailsContract,
  MovieListResponse as MovieListResponseContract,
  MovieMutationPayload,
  MovieSummary as MovieSummaryContract,
} from '@movie-explorer/contracts';

export type MovieSummaryContractType = MovieSummaryContract;
export type MovieDetailsContractType = MovieDetailsContract;
export type MovieListResponseContractType = MovieListResponseContract;

export class GetMoviesQuery {
  @ApiPropertyOptional({
    enum: ['title', 'releaseDate', 'rating'],
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsIn(['title', 'releaseDate', 'rating'])
  sort?: 'title' | 'releaseDate' | 'rating';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    description: 'Sort direction',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Movie title search value' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Genre filter',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  @IsOptional()
  @IsString({ each: true })
  genre?: string | string[];

  @ApiPropertyOptional({ description: 'Offset in result array for pagination' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({
    description: 'Limit amount of items in result array for pagination',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  limit?: number = 10;
}

export class MovieSummary implements MovieSummaryContract {
  @ApiProperty({ description: 'Movie identifier', example: 313369 })
  id: number;

  @ApiProperty({ description: 'Movie title', example: 'La La Land' })
  title: string;

  @ApiProperty({ description: 'Movie release date', example: '2016-12-29' })
  releaseDate: string;

  @ApiProperty({
    description: 'URL to the poster image',
    example: 'https://example.com/posters/la-la-land.jpg',
  })
  posterUrl: string;

  @ApiProperty({
    description: 'List of genres',
    example: ['Comedy', 'Drama', 'Romance'],
  })
  genres: string[];
}

export class MovieDetails extends MovieSummary implements MovieDetailsContract {
  @ApiProperty({ description: 'Movie rating', example: 7.9 })
  rating: number;

  @ApiProperty({ description: 'Movie duration in minutes', example: 128 })
  runtimeMinutes: number;

  @ApiProperty({
    description: 'Short description of the movie',
    example: 'Mia, an aspiring actress, serves lattes to movie stars...',
  })
  description: string;
}

export class MoviesResponse implements MovieListResponseContract {
  @ApiProperty({
    description: 'List of movies',
    type: () => [MovieSummary],
  })
  movies: MovieSummary[];

  @ApiProperty({
    description: 'Total number of matching movies',
  })
  total: number;

  @ApiProperty({
    description: 'Offset in result array for pagination',
  })
  offset: number;

  @ApiProperty({
    description: 'Limit amount of items in result array for pagination',
  })
  limit: number;
}

export class MovieMutationDto implements MovieMutationPayload {
  @ApiPropertyOptional({ description: 'Movie identifier', example: 313369 })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiProperty({ description: 'Movie title', example: 'La La Land' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Movie release date', example: '2016-12-29' })
  @IsString()
  releaseDate: string;

  @ApiProperty({
    description: 'URL to the poster image',
    example: 'https://example.com/posters/la-la-land.jpg',
  })
  @IsUrl()
  posterUrl: string;

  @ApiProperty({
    description: 'List of genres',
    example: ['Comedy', 'Drama', 'Romance'],
  })
  @IsArray()
  @IsString({ each: true })
  genres: string[];

  @ApiProperty({ description: 'Movie rating', example: 7.9 })
  @IsNumber()
  rating: number;

  @ApiProperty({ description: 'Movie duration in minutes', example: 128 })
  @IsInt()
  runtimeMinutes: number;

  @ApiProperty({
    description: 'Short description of the movie',
    example: 'Mia, an aspiring actress, serves lattes to movie stars...',
  })
  @IsString()
  description: string;
}
