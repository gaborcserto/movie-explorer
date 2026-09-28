import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsIn,
  IsString,
  IsInt,
  IsArray,
  IsUrl,
  ValidateIf,
  Min,
} from 'class-validator';

export class GetMoviesFilter {
  @ApiPropertyOptional({ description: 'Field to sort by' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    description: 'Value to define sort direction',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Search value' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['title', 'genres'],
    description: 'Type of search',
  })
  @IsOptional()
  @IsIn(['title', 'genres'])
  searchBy?: 'title' | 'genres';

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((o) => o.filter && o.filter.length > 0)
  @IsString({ each: true })
  filter?: string[];

  @ApiPropertyOptional({ description: 'Offset in result array for pagination' })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({
    description: 'Limit amount of items in result array for pagination',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  limit?: number = 10;
}

export class MoviesResponse {
  @ApiProperty({
    description: 'List of movies',
    example: [
      {
        id: 313369,
        title: 'La La Land',
        tagline: "Here's to the fools who dream.",
        vote_average: 7.9,
        vote_count: 6782,
        release_date: '2016-12-29',
        poster_path:
          'https://image.tmdb.org/t/p/w500/ylXCdC106IKiarftHkcacasaAcb.jpg',
        overview: 'Mia, an aspiring actress...',
        budget: 30000000,
        revenue: 445435700,
        runtime: 128,
        genres: ['Comedy', 'Drama', 'Romance'],
      },
    ],
  })
  data: Movie[];

  @ApiProperty({
    description: 'Total number of movies',
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Offset in result array for pagination',
  })
  offset: number;

  @ApiProperty({
    description: 'Limit amount of items in result array for pagination',
  })
  limit: number;
}

export class Movie {
  @ApiProperty({ description: 'movies ID', example: 313369 })
  id?: number;

  @ApiProperty({ description: 'movies title', example: 'La La Land' })
  title?: string;

  @ApiProperty({
    description: 'movies tagline',
    example: "Here's to the fools who dream.",
  })
  tagline?: string;

  @ApiProperty({ description: 'movies average rating', example: 7.9 })
  vote_average?: number;

  @ApiProperty({
    description: 'Total count of votes for the movie',
    example: 6782,
  })
  vote_count?: number;

  @ApiProperty({ description: 'movies release date', example: '2016-12-29' })
  release_date: string;

  @ApiProperty({
    description: 'URL to the poster image',
    example: 'https://image.tmdb.org/t/p/w500/ylXCdC106IKiarftHkcacasaAcb.jpg',
  })
  @IsUrl()
  poster_path: string;

  @ApiProperty({
    description: 'Short description of the movie',
    example:
      'Mia, an aspiring actress, serves lattes to movie stars in between auditions and Sebastian, a jazz musician, scrapes by playing cocktail party gigs in dingy bars, but as success mounts they are faced with decisions that begin to fray the fragile fabric of their love affair, and the dreams they worked so hard to maintain in each other threaten to rip them apart.',
  })
  overview: string;

  @ApiProperty({ description: 'movies production budget', example: 30000000 })
  budget?: number;

  @ApiProperty({ description: 'movies revenue', example: 445435700 })
  revenue?: number;

  @ApiProperty({ description: 'movies duration time', example: 128 })
  runtime: number;

  @ApiProperty({
    description: 'List of genres',
    example: ['Comedy', 'Drama', 'Romance'],
  })
  genres: string[];
}
