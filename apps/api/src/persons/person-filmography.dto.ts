import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import type {
  CombinedFilmography,
  FilmographyMediaType,
  PersonActingRole,
  PersonSeriesCredit,
} from '@movie-explorer/contracts';

import { SectionAvailabilityDto } from '../validation/section-availability.dto';
import { PersonCrewCreditDto, PersonFilmographyEntryDto } from './persons.dto';

export class PersonIncludeQuery {
  @ApiPropertyOptional({
    enum: ['combinedFilmography'],
    description:
      'Opt into combined Movie/Series filmography; default response stays movie-only',
  })
  @IsOptional()
  @IsIn(['combinedFilmography'])
  include?: 'combinedFilmography';
}

export class CombinedFilmographyQuery {
  @ApiPropertyOptional({ enum: ['all', 'movie', 'tv'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'movie', 'tv'])
  mediaType: FilmographyMediaType = 'all';
}

export class PersonActingRoleDto implements PersonActingRole {
  @ApiProperty({ type: String, nullable: true })
  creditId: string | null;
  @ApiProperty({ type: String, nullable: true })
  character: string | null;
  @ApiProperty({ type: 'integer', minimum: 0, nullable: true })
  episodeCount: number | null;
}

export class PersonMovieCreditDto extends PersonFilmographyEntryDto {
  @ApiProperty({ enum: ['movie'] })
  mediaType: 'movie';
}

export class PersonSeriesCreditDto implements PersonSeriesCredit {
  @ApiProperty({ enum: ['tv'] })
  mediaType: 'tv';
  @ApiProperty({
    type: 'integer',
    minimum: 1,
    maximum: Number.MAX_SAFE_INTEGER,
  })
  id: number;
  @ApiProperty({ type: String })
  title: string;
  @ApiProperty({ type: String, nullable: true })
  originalTitle: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    format: 'date',
    description: 'Series premiere; not the person participation date',
  })
  firstAirDate: string | null;
  @ApiProperty({ type: String, nullable: true })
  posterUrl: string | null;
  @ApiPropertyOptional({ type: String })
  posterSrcSet?: string;
  @ApiProperty({ type: [String] })
  genres: string[];
  @ApiPropertyOptional({ type: [String] })
  actingCredits?: string[];
  @ApiPropertyOptional({ type: [PersonActingRoleDto] })
  actingRoles?: PersonActingRole[];
  @ApiProperty({ type: [PersonCrewCreditDto] })
  crewCredits: PersonCrewCreditDto[];
}

export class FilmographyGroupsDto {
  @ApiPropertyOptional({
    type: SectionAvailabilityDto,
    description: 'Present when movie credits were requested',
  })
  movie?: CombinedFilmography['groups']['movie'];
  @ApiPropertyOptional({
    type: SectionAvailabilityDto,
    description: 'Present when series credits were requested',
  })
  tv?: CombinedFilmography['groups']['tv'];
}

export class CombinedFilmographyDto implements CombinedFilmography {
  @ApiProperty({
    type: 'array',
    items: {
      oneOf: [
        { $ref: '#/components/schemas/PersonMovieCreditDto' },
        { $ref: '#/components/schemas/PersonSeriesCreditDto' },
      ],
      discriminator: { propertyName: 'mediaType' },
    },
  })
  entries: CombinedFilmography['entries'];
  @ApiProperty({ type: FilmographyGroupsDto })
  groups: CombinedFilmography['groups'];
}
