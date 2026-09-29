import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
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
