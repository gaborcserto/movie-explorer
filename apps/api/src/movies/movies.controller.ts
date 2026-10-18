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
  Query,
  NotFoundException,
} from '@nestjs/common';
import { MoviesService } from './movies.service';
import { DetailIdParams } from '../validation/detail-id.dto';
import {
  GetMoviesQuery,
  GetMovieSuggestionsQuery,
  MovieDetails as MovieDetailsDto,
  MoviesResponse,
} from './movies.dto';
import type {
  MovieDetails,
  MovieListResponse,
  MovieSuggestionsResponse,
} from '@movie-explorer/contracts';

@ApiTags('movies')
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  // Intentionally public movie browsing; no authentication is required.
  // nestjs-doctor-ignore-next-line security/require-guards-on-endpoints
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

  // Intentionally public autocomplete; no authentication is required.
  // nestjs-doctor-ignore-next-line security/require-guards-on-endpoints
  @Get('suggestions')
  @ApiOperation({ summary: 'Get compact movie title suggestions' })
  public async getMovieSuggestions(
    @Query() query: GetMovieSuggestionsQuery,
  ): Promise<MovieSuggestionsResponse> {
    return this.moviesService.findSuggestions(query.query, query.limit ?? 6);
  }

  // Intentionally public movie details; no authentication is required.
  // nestjs-doctor-ignore-next-line security/require-guards-on-endpoints
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
    @Param() params: DetailIdParams,
  ): Promise<MovieDetails> {
    const movie = await this.moviesService.findOne(params.id);

    if (!movie) {
      throw new NotFoundException('Movie not found');
    }
    return movie;
  }
  @Get(':id/credits')
  public getCredits(@Param() params: DetailIdParams) {
    return this.moviesService.findMovieSection(params.id, 'credits');
  }

  @Get(':id/videos')
  public getVideos(@Param() params: DetailIdParams) {
    return this.moviesService.findMovieSection(params.id, 'videos');
  }

  @Get(':id/photos')
  public getPhotos(@Param() params: DetailIdParams) {
    return this.moviesService.findMovieSection(params.id, 'photos');
  }
}
