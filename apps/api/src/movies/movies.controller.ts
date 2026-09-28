import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiNotFoundResponse,
  ApiParam,
} from '@nestjs/swagger';
import {
  Get,
  Post,
  Put,
  Controller,
  Param,
  ParseIntPipe,
  Body,
  Delete,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { MoviesService } from './movies.service';
import {
  GetMoviesQuery,
  MovieDetails,
  MovieMutationDto,
  MoviesResponse,
} from './movies.dto';

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
  ): Promise<MoviesResponse> {
    return this.moviesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get movie by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return a single movie.',
    type: () => MovieDetails,
  })
  @ApiNotFoundResponse({ description: 'Movie not found' })
  @ApiParam({ name: 'id', description: 'Movie unique identifier' })
  public async getMovie(
    @Param('id', ParseIntPipe) id: string,
  ): Promise<MovieDetails> {
    const movieId = parseInt(id, 10);

    if (isNaN(movieId)) {
      throw new HttpException('ID must be a number', HttpStatus.BAD_REQUEST);
    }

    const movie = await this.moviesService.findOne(movieId);

    if (!movie) {
      throw new HttpException('Movie not found', HttpStatus.NOT_FOUND);
    }
    return movie;
  }

  @Post()
  @ApiOperation({ summary: 'Create a movie' })
  @ApiResponse({
    status: 501,
    description:
      'Movie mutations are not supported by the configured movie provider.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request, possibly due to invalid input data.',
  })
  public async createMovie(@Body() movie: MovieMutationDto): Promise<void> {
    try {
      await this.moviesService.create(movie);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : 'Unknown validation error';

      throw new HttpException(
        'Error creating movie: ' + message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put()
  @ApiOperation({ summary: 'Update a movie by ID' })
  @ApiResponse({
    status: 501,
    description:
      'Movie mutations are not supported by the configured movie provider.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request, possibly due to invalid input data.',
  })
  public async updateMovie(
    @Body('id', ParseIntPipe) id: number,
    @Body() movie: MovieMutationDto,
  ): Promise<MovieDetails> {
    const updatedMovie = await this.moviesService.update(id, movie);
    if (!updatedMovie) {
      throw new HttpException('Movie not found', HttpStatus.NOT_FOUND);
    }
    return updatedMovie;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a movie by ID' })
  @ApiResponse({
    status: 501,
    description:
      'Movie mutations are not supported by the configured movie provider.',
  })
  @ApiParam({ name: 'id', description: 'Movie unique identifier' })
  public async deleteMovie(@Param('id') id: string): Promise<void> {
    const movieId = parseInt(id, 10);

    if (isNaN(movieId)) {
      throw new HttpException('ID must be a number', HttpStatus.BAD_REQUEST);
    }

    const result = await this.moviesService.delete(movieId);
    if (!result) {
      throw new HttpException('Movie not found', HttpStatus.NOT_FOUND);
    }
    return;
  }
}
