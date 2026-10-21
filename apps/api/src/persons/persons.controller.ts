import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import {
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
import { GetPeopleQuery } from './people.dto';

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
  @ApiOperation({ summary: 'Search people by name' })
  public getPeople(@Query() query: GetPeopleQuery) {
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
  @ApiOkResponse({ type: () => PersonDetailsDto })
  @ApiBadRequestResponse({ description: 'Invalid person ID' })
  @ApiNotFoundResponse({ description: 'Person not found' })
  @ApiBadGatewayResponse({
    description: 'Person provider failed or returned invalid data',
  })
  public async getPerson(
    @Param() params: GetPersonParams,
  ): Promise<PersonDetails> {
    const person = await this.personsService.findOne(params.id);

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    return person;
  }

  @Get(':id/filmography')
  public getFilmography(@Param() params: GetPersonParams) {
    return this.personsService.findFilmography(params.id);
  }
}
