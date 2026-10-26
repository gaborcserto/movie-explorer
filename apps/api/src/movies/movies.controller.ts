import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiBadRequestResponse,
  ApiBadGatewayResponse,
  ApiGatewayTimeoutResponse,
  ApiTooManyRequestsResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import {
  Get,
  Controller,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import type {
  MovieDetails,
  MovieListResponse,
  MovieSuggestionsResponse,
} from '@movie-explorer/contracts';

import { MoviesService } from './movies.service';
import { DetailIdParams } from '../validation/detail-id.dto';
import {
  GetMoviesQuery,
  GetMovieSuggestionsQuery,
  MovieDetails as MovieDetailsDto,
  MoviesResponse,
} from './movies.dto';
import { WatchProvidersDto } from './watch-providers.dto';
import { RatingsDto } from '../ratings/ratings.dto';

@ApiTags('Movies')
@ApiBadRequestResponse({
  description: 'Invalid query or decimal safe-integer ID',
})
@ApiBadGatewayResponse({
  description: 'Provider failure or malformed response',
})
@ApiGatewayTimeoutResponse({ description: 'Provider deadline exceeded' })
@ApiTooManyRequestsResponse({ description: 'Provider rate limit reached' })
@Controller('api/v1/movies')
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
  // Static routes must be registered before :id; validation runs after routing.
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
  @ApiParam({
    name: 'id',
    description: 'Positive decimal safe integer movie ID',
    schema: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
  })
  public async getMovie(
    @Param() params: DetailIdParams,
  ): Promise<MovieDetails> {
    const movie = await this.moviesService.findOne(params.id);

    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    return movie;
  }

  @Get(':id/watch-providers')
  @ApiOperation({ summary: 'Get Hungarian streaming, rent and buy providers' })
  @ApiParam({
    name: 'id',
    schema: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
  })
  @ApiResponse({ status: 200, type: WatchProvidersDto })
  public async getWatchProviders(@Param() params: DetailIdParams) {
    const providers = await this.moviesService.findWatchProviders(params.id);
    if (!providers) {
      throw new NotFoundException('Movie not found');
    }
    return providers;
  }

  @Get(':id/ratings')
  @ApiOperation({
    summary: 'Get TMDB and IMDb ratings independently of movie details',
    description:
      'Returns each source as available, missing, or unavailable. Provider failures are represented with a source-specific unavailable reason; a confirmed missing movie returns 404.',
  })
  @ApiOkResponse({ type: RatingsDto })
  @ApiNotFoundResponse({ description: 'Movie not found' })
  public async getRatings(@Param() params: DetailIdParams) {
    const ratings = await this.moviesService.findRatings(params.id);
    if (!ratings) {
      throw new NotFoundException('Movie not found');
    }

    return ratings;
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

  @Get(':id/posters')
  public getPosters(@Param() params: DetailIdParams) {
    return this.moviesService.findMovieSection(params.id, 'posters');
  }
}
