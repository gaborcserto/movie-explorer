import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiNotFoundResponse,
  ApiParam,
} from '@nestjs/swagger';
import {
  Get,
  Controller,
  Param,
  ParseIntPipe,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { MoviesService } from './movies.service';
import {
  GetMoviesQuery,
  MovieDetails as MovieDetailsDto,
  MoviesResponse,
} from './movies.dto';
import type {
  MovieDetails,
  MovieListResponse,
} from '@movie-explorer/contracts';

@ApiTags('movies')
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  @ApiOperation({ summary: 'Get movies list' })
  @ApiResponse({
    status: 200,
    description: 'Return all movies.',
    type: () => MoviesResponse,
  })
  public async getAllMovies(
    @Query() query: GetMoviesQuery,
  ): Promise<MovieListResponse> {
    return this.moviesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get movie by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return a single movie.',
    type: () => MovieDetailsDto,
  })
  @ApiNotFoundResponse({ description: 'Movie not found' })
  @ApiParam({ name: 'id', description: 'Movie unique identifier' })
  public async getMovie(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MovieDetails> {
    const movie = await this.moviesService.findOne(id);

    if (!movie) {
      throw new HttpException('Movie not found', HttpStatus.NOT_FOUND);
    }
    return movie;
  }
}
