import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  CreditPerson,
  SeriesOrganization,
  SeasonSummary,
  SeriesDetails,
  SeasonDetails,
  EpisodeSummary,
  EpisodeDetails,
  EpisodeCredits,
  EpisodeCastMember,
  EpisodeCrewMember,
} from '@movie-explorer/contracts';

import { SectionAvailabilityDto } from '../validation/section-availability.dto';

export class CreditPersonDto implements CreditPerson {
  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: Number.MAX_SAFE_INTEGER,
  })
  id?: number;

  @ApiProperty({ type: String })
  name: string;

  @ApiPropertyOptional({ type: String })
  profileUrl?: string;

  @ApiPropertyOptional({ type: String })
  profileSrcSet?: string;
}

export class SeriesOrganizationDto implements SeriesOrganization {
  @ApiProperty({
    type: 'integer',
    minimum: 1,
    maximum: Number.MAX_SAFE_INTEGER,
  })
  id: number;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: String, nullable: true })
  logoUrl: string | null;

  @ApiProperty({ type: String, nullable: true })
  originCountry: string | null;
}

export class SeasonSummaryDto implements SeasonSummary {
  @ApiProperty({
    type: 'integer',
    minimum: 1,
    maximum: Number.MAX_SAFE_INTEGER,
  })
  id: number;

  @ApiProperty({
    type: 'integer',
    minimum: 0,
    maximum: Number.MAX_SAFE_INTEGER,
  })
  seasonNumber: number;

  @ApiProperty({ type: String })
  title: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, nullable: true, format: 'date' })
  airDate: string | null;

  @ApiProperty({
    type: 'integer',
    nullable: true,
    minimum: 0,
    maximum: Number.MAX_SAFE_INTEGER,
  })
  episodeCount: number | null;

  @ApiProperty({ type: String, nullable: true })
  posterUrl: string | null;

  @ApiPropertyOptional({ type: String })
  posterSrcSet?: string;
}

export class SeriesDetailsDto implements SeriesDetails {
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

  @ApiProperty({ type: String, nullable: true, format: 'date' })
  firstAirDate: string | null;

  @ApiProperty({ type: String, nullable: true })
  posterUrl: string | null;

  @ApiPropertyOptional({ type: String })
  posterSrcSet?: string;

  @ApiProperty({ type: [String] })
  genres: string[];

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, nullable: true })
  originalLanguage: string | null;

  @ApiProperty({ type: String, nullable: true })
  status: string | null;

  @ApiProperty({ type: Boolean, nullable: true })
  inProduction: boolean | null;

  @ApiProperty({ type: String, nullable: true, format: 'date' })
  lastAirDate: string | null;

  @ApiProperty({
    type: 'integer',
    nullable: true,
    minimum: 0,
    maximum: Number.MAX_SAFE_INTEGER,
  })
  seasonCount: number | null;

  @ApiProperty({
    type: 'integer',
    nullable: true,
    minimum: 0,
    maximum: Number.MAX_SAFE_INTEGER,
  })
  episodeCount: number | null;

  @ApiProperty({
    type: [Number],
    description:
      'Positive runtimes supplied by the provider; empty means unknown',
  })
  episodeRuntimeMinutes: number[];

  @ApiProperty({ type: 'number', nullable: true, minimum: 0, maximum: 10 })
  rating: number | null;

  @ApiProperty({ type: String, nullable: true })
  backdropUrl: string | null;

  @ApiProperty({
    type: 'integer',
    nullable: true,
    minimum: 0,
    maximum: Number.MAX_SAFE_INTEGER,
  })
  voteCount: number | null;

  @ApiProperty({
    type: [String],
    description: 'Normalized two-letter origin countries; empty means unknown',
  })
  originCountries: string[];

  @ApiProperty({ type: () => [CreditPersonDto] })
  creators: CreditPersonDto[];

  @ApiProperty({ type: () => [SeriesOrganizationDto] })
  networks: SeriesOrganizationDto[];

  @ApiProperty({ type: () => [SeriesOrganizationDto] })
  productionCompanies: SeriesOrganizationDto[];

  @ApiProperty({
    type: () => [SeasonSummaryDto],
    description:
      'Ascending season number, including season 0; entries without identity, number or title are omitted',
  })
  seasons: SeasonSummaryDto[];
}

export class EpisodeSummaryDto implements EpisodeSummary {
  @ApiProperty({
    type: 'integer',
    minimum: 1,
    maximum: Number.MAX_SAFE_INTEGER,
  })
  id: number;

  @ApiProperty({
    type: 'integer',
    minimum: 1,
    maximum: Number.MAX_SAFE_INTEGER,
  })
  seriesId: number;

  @ApiProperty({
    type: 'integer',
    minimum: 0,
    maximum: Number.MAX_SAFE_INTEGER,
  })
  seasonNumber: number;

  @ApiProperty({
    type: 'integer',
    minimum: 1,
    maximum: Number.MAX_SAFE_INTEGER,
  })
  episodeNumber: number;

  @ApiProperty({ type: String })
  title: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, nullable: true })
  stillUrl: string | null;

  @ApiProperty({ type: String, nullable: true, format: 'date' })
  airDate: string | null;

  @ApiProperty({ type: 'integer', nullable: true, minimum: 1 })
  runtimeMinutes: number | null;

  @ApiProperty({ type: 'number', nullable: true, minimum: 0, maximum: 10 })
  rating: number | null;

  @ApiProperty({
    type: 'integer',
    nullable: true,
    minimum: 0,
    maximum: Number.MAX_SAFE_INTEGER,
  })
  voteCount: number | null;
}

export class SeasonDetailsDto
  extends SeasonSummaryDto
  implements SeasonDetails
{
  @ApiProperty({
    type: 'integer',
    minimum: 1,
    maximum: Number.MAX_SAFE_INTEGER,
  })
  seriesId: number;

  @ApiProperty({
    type: 'integer',
    minimum: 0,
    description: 'Number of returned episodes, not advertised schedule total',
  })
  episodeCount: number;

  @ApiProperty({ type: () => [EpisodeSummaryDto] })
  episodes: EpisodeSummaryDto[];
}

export class EpisodeCastMemberDto
  extends CreditPersonDto
  implements EpisodeCastMember
{
  @ApiProperty({ type: [String] })
  characters: string[];
}

export class EpisodeCrewMemberDto
  extends CreditPersonDto
  implements EpisodeCrewMember
{
  @ApiProperty({ type: String, nullable: true })
  department: string | null;

  @ApiProperty({ type: [String] })
  jobs: string[];
}

export class EpisodeCreditSectionsDto {
  @ApiProperty({ type: () => SectionAvailabilityDto })
  cast: EpisodeCredits['sections']['cast'];

  @ApiProperty({ type: () => SectionAvailabilityDto })
  guestStars: EpisodeCredits['sections']['guestStars'];

  @ApiProperty({ type: () => SectionAvailabilityDto })
  crew: EpisodeCredits['sections']['crew'];
}

export class EpisodeCreditsDto implements EpisodeCredits {
  @ApiProperty({ type: () => [EpisodeCastMemberDto] })
  cast: EpisodeCastMemberDto[];

  @ApiProperty({ type: () => [EpisodeCastMemberDto] })
  guestStars: EpisodeCastMemberDto[];

  @ApiProperty({ type: () => [EpisodeCrewMemberDto] })
  crew: EpisodeCrewMemberDto[];

  @ApiProperty({ type: () => EpisodeCreditSectionsDto })
  sections: EpisodeCreditSectionsDto;
}

export class EpisodeDetailsDto
  extends EpisodeSummaryDto
  implements EpisodeDetails
{
  @ApiProperty({ type: () => EpisodeCreditsDto })
  credits: EpisodeCreditsDto;
}
