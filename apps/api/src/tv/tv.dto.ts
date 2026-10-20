import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  CreditPerson,
  TvOrganization,
  TvSeasonSummary,
  TvSeriesDetails,
} from '@movie-explorer/contracts';

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

export class TvOrganizationDto implements TvOrganization {
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

export class TvSeasonSummaryDto implements TvSeasonSummary {
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

export class TvSeriesDetailsDto implements TvSeriesDetails {
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

  @ApiProperty({ type: () => [CreditPersonDto] })
  creators: CreditPersonDto[];

  @ApiProperty({ type: () => [TvOrganizationDto] })
  networks: TvOrganizationDto[];

  @ApiProperty({ type: () => [TvOrganizationDto] })
  productionCompanies: TvOrganizationDto[];

  @ApiProperty({
    type: () => [TvSeasonSummaryDto],
    description:
      'Ascending season number, including season 0; entries without identity, number or title are omitted',
  })
  seasons: TvSeasonSummaryDto[];
}
