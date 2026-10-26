import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiGatewayTimeoutResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type { PersonDetails } from '@movie-explorer/contracts';
import { GetPersonParams, PersonDetailsDto } from './persons.dto';
import { PersonsService } from './persons.service';
import {
  CombinedFilmographyDto,
  CombinedFilmographyQuery,
  PersonIncludeQuery,
  PersonMovieCreditDto,
  PersonSeriesCreditDto,
} from './person-filmography.dto';
import { PersonListingQuery, PersonListResponseDto } from './people.dto';

@ApiExtraModels(
  CombinedFilmographyDto,
  PersonMovieCreditDto,
  PersonSeriesCreditDto,
)
@ApiTags('Persons')
@ApiBadRequestResponse({
  description: 'Invalid query or decimal safe-integer ID',
})
@ApiBadGatewayResponse({
  description: 'Provider failure or malformed response',
})
@ApiGatewayTimeoutResponse({ description: 'Provider deadline exceeded' })
@ApiTooManyRequestsResponse({ description: 'Provider rate limit reached' })
@Controller('api/v1/persons')
export class PersonsController {
  constructor(private readonly personsService: PersonsService) {}

  // Intentionally public person search.
  // nestjs-doctor-ignore-next-line security/require-guards-on-endpoints
  @Get()
  @ApiOperation({ summary: 'Browse popular persons or search by name' })
  @ApiOkResponse({ type: PersonListResponseDto })
  public getPeople(@Query() query: PersonListingQuery) {
    return this.personsService.findPeople(query.query, query.page);
  }

  // Intentionally public person details; no authentication is required.
  // nestjs-doctor-ignore-next-line security/require-guards-on-endpoints
  @Get(':id')
  @ApiOperation({ summary: 'Get person profile and movie filmography' })
  @ApiParam({
    name: 'id',
    description: 'Positive integer TMDB person ID',
    schema: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
  })
  @ApiOkResponse({
    schema: {
      allOf: [
        { $ref: '#/components/schemas/PersonDetailsDto' },
        {
          type: 'object',
          properties: {
            combinedFilmography: {
              $ref: '#/components/schemas/CombinedFilmographyDto',
            },
          },
        },
      ],
    },
  })
  @ApiExtraModels(PersonDetailsDto)
  @ApiBadRequestResponse({ description: 'Invalid person ID' })
  @ApiNotFoundResponse({ description: 'Person not found' })
  @ApiBadGatewayResponse({
    description: 'Person provider failed or returned invalid data',
  })
  public async getPerson(
    @Param() params: GetPersonParams,
    @Query() query: PersonIncludeQuery = {},
  ): Promise<PersonDetails> {
    const person = query.include
      ? await this.personsService.findOne(params.id, query.include)
      : await this.personsService.findOne(params.id);

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    return person;
  }

  @Get(':id/combined-filmography')
  @ApiOperation({
    summary: 'Recover selected Movie/Series filmography groups',
    description:
      'Only requested sources are fetched. Available empty arrays differ from unavailable sources. Partial success is retained; all failures return an error with rate-limit priority.',
  })
  @ApiParam({
    name: 'id',
    schema: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
  })
  @ApiOkResponse({ type: CombinedFilmographyDto })
  @ApiNotFoundResponse({ description: 'Person not found' })
  async getCombined(
    @Param() params: GetPersonParams,
    @Query() query: CombinedFilmographyQuery,
  ) {
    const result = await this.personsService.findCombined(
      params.id,
      query.mediaType,
    );

    if (!result) {
      throw new NotFoundException('Person not found');
    }

    return result;
  }

  @Get(':id/filmography')
  public getFilmography(@Param() params: GetPersonParams) {
    return this.personsService.findFilmography(params.id);
  }
}
