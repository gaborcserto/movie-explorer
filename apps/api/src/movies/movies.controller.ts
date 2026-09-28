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
import { GetMoviesFilter, MoviesResponse, Movie } from './movies.dto';

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
    @Query() filter: GetMoviesFilter,
  ): Promise<MoviesResponse> {
    return this.moviesService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get movie by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return a single movie.',
    type: () => Movie,
  })
  @ApiNotFoundResponse({ description: 'Movie not found' })
  @ApiParam({ name: 'id', description: 'Movie unique identifier' })
  public async getMovie(@Param('id', ParseIntPipe) id: string): Promise<Movie> {
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
    status: 201,
    description: 'The movie has been successfully created.',
    type: () => Movie,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request, possibly due to invalid input data.',
  })
  public async createMovie(@Body() movie: Movie): Promise<void> {
    try {
      await this.moviesService.create(movie);
    } catch (error) {
      throw new HttpException(
        'Error creating movie: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put()
  @ApiOperation({ summary: 'Update a movie by ID' })
  @ApiResponse({
    status: 200,
    description: 'The movie has been successfully updated.',
    type: Movie,
  })
  @ApiNotFoundResponse({ description: 'Movie not found' })
  @ApiResponse({
    status: 400,
    description: 'Bad request, possibly due to invalid input data.',
  })
  public async updateMovie(
    @Body('id', ParseIntPipe) id: number,
    @Body() movie: Movie,
  ): Promise<Movie> {
    const updatedMovie = await this.moviesService.update(id, movie);
    if (!updatedMovie) {
      throw new HttpException('Movie not found', HttpStatus.NOT_FOUND);
    }
    return updatedMovie;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a movie by ID' })
  @ApiResponse({
    status: 204,
    description: 'The movie has been successfully deleted.',
  })
  @ApiNotFoundResponse({ description: 'Movie not found' })
  @ApiParam({ name: 'id', description: 'Movie unique identifier' })
  public async deleteMovie(@Param('id') id: string): Promise<void> {
    const movieId = parseInt(id, 10);

    if (isNaN(movieId)) {
      throw new HttpException('ID must be a number', HttpStatus.BAD_REQUEST);
    }

    const result = this.moviesService.delete(movieId);
    if (!result) {
      throw new HttpException('Movie not found', HttpStatus.NOT_FOUND);
    }
    return;
  }
}
