import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  MovieDetails as MovieDetailsContract,
  MovieListResponse as MovieListResponseContract,
  MovieQueryParams,
  MovieSummary as MovieSummaryContract,
  MovieSortField,
  MovieSortOrder,
} from '@movie-explorer/contracts';
import type {
  MovieCastMember,
  MoviePhoto,
  MovieVideo,
} from '@movie-explorer/contracts';

const MOVIE_SORT_FIELDS = [
  'popularity',
  'title',
  'releaseDate',
  'rating',
] as const satisfies readonly MovieSortField[];
const MOVIE_SORT_ORDERS = [
  'asc',
  'desc',
] as const satisfies readonly MovieSortOrder[];

export class GetMoviesQuery implements MovieQueryParams {
  @ApiPropertyOptional({
    enum: MOVIE_SORT_FIELDS,
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsIn(MOVIE_SORT_FIELDS)
  sort?: MovieQueryParams['sort'];

  @ApiPropertyOptional({
    enum: MOVIE_SORT_ORDERS,
    description: 'Sort direction',
  })
  @IsOptional()
  @IsIn(MOVIE_SORT_ORDERS)
  sortOrder?: MovieQueryParams['sortOrder'];

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

  @ApiPropertyOptional({ description: 'Release year', example: 2024 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1874)
  @Max(9999)
  releaseYear?: number;

  @ApiPropertyOptional({
    description: 'Minimum TMDB user rating',
    minimum: 0,
    maximum: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  minimumRating?: number;

  @ApiPropertyOptional({ description: 'TMDB result page', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  page?: number = 1;
}

export class GetMovieSuggestionsQuery {
  @ApiProperty({ description: 'Movie title search value', minLength: 2 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  query: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 10, default: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number = 6;
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
  @ApiProperty({
    description: 'Primary billed cast names',
    example: ['Emma Stone', 'Ryan Gosling'],
  })
  cast: string[];

  @ApiPropertyOptional({
    description: 'Visual cast entries with roles and profile images',
  })
  castMembers?: MovieCastMember[];

  @ApiPropertyOptional({ description: 'Movie rating', example: 7.9 })
  rating?: number;

  @ApiPropertyOptional({
    description: 'Movie duration in minutes',
    example: 128,
  })
  runtimeMinutes?: number;

  @ApiPropertyOptional({
    description: 'Movie director',
    example: 'Damien Chazelle',
  })
  director?: string;

  @ApiPropertyOptional({
    description: 'Short description of the movie',
    example: 'Mia, an aspiring actress, serves lattes to movie stars...',
  })
  description?: string;

  @ApiPropertyOptional({ description: 'Backdrop image URL' })
  backdropUrl?: string;

  @ApiPropertyOptional({
    type: () => [Object],
    description: 'Movie still thumbnail and full-resolution image URLs',
  })
  photos?: MoviePhoto[];

  @ApiPropertyOptional({
    type: () => [Object],
    description: 'External movie video links',
  })
  videos?: MovieVideo[];
}

export class MoviesResponse implements MovieListResponseContract {
  @ApiProperty({
    description: 'List of movies',
    type: () => [MovieSummary],
  })
  movies: MovieSummary[];

  @ApiProperty({ description: 'Current TMDB result page' })
  page: number;

  @ApiProperty({ description: 'Total number of available TMDB pages' })
  totalPages: number;

  @ApiProperty({
    description: 'Total number of results in the active TMDB result set',
  })
  totalResults: number;
}
