import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  PersonDetails,
  PersonCrewCredit,
  PersonFilmographyEntry,
} from '@movie-explorer/contracts';
import { MovieSummary } from '../movies/movies.dto';

export class GetPersonParams {
  @ApiProperty({
    type: 'integer',
    minimum: 1,
    maximum: Number.MAX_SAFE_INTEGER,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN,
  )
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  id: number;
}

export class PersonCrewCreditDto implements PersonCrewCredit {
  @ApiPropertyOptional()
  department?: string;

  @ApiPropertyOptional()
  job?: string;
}

export class PersonFilmographyEntryDto
  extends MovieSummary
  implements PersonFilmographyEntry
{
  @ApiPropertyOptional({
    type: [String],
    description: 'Distinct characters; empty for an unknown acting role',
  })
  actingCredits?: string[];

  @ApiProperty({ type: () => [PersonCrewCreditDto] })
  crewCredits: PersonCrewCreditDto[];
}

export class PersonDetailsDto implements PersonDetails {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  knownForDepartment?: string;

  @ApiPropertyOptional({ format: 'date' })
  birthday?: string;

  @ApiPropertyOptional({ format: 'date' })
  deathDate?: string;

  @ApiPropertyOptional()
  placeOfBirth?: string;

  @ApiPropertyOptional()
  biography?: string;

  @ApiPropertyOptional()
  profileUrl?: string;

  @ApiPropertyOptional({
    description: 'Responsive portrait density candidates',
  })
  profileSrcSet?: string;

  @ApiProperty({ type: () => [PersonFilmographyEntryDto] })
  filmography: PersonFilmographyEntryDto[];
}
