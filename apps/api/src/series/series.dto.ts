import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  CreditPerson,
  SeriesImages,
  SeriesVideos,
  MediaPhoto,
  MediaVideo,
  SeriesCredits,
  SeriesCastMember,
  SeriesCrewMember,
  SeriesCrewDepartment,
  SeriesCharacter,
  SeriesJob,
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

export class SeriesCharacterDto implements SeriesCharacter {
  @ApiProperty({ type: String, nullable: true })
  creditId: string | null;
  @ApiProperty({ type: String, nullable: true })
  character: string | null;
  @ApiProperty({ type: 'integer', minimum: 0, nullable: true })
  episodeCount: number | null;
}

export class SeriesJobDto implements SeriesJob {
  @ApiProperty({ type: String, nullable: true })
  creditId: string | null;
  @ApiProperty({ type: String, nullable: true })
  job: string | null;
  @ApiProperty({ type: String, nullable: true })
  department: string | null;
  @ApiProperty({ type: 'integer', minimum: 0, nullable: true })
  episodeCount: number | null;
}

export class SeriesCastMemberDto
  extends CreditPersonDto
  implements SeriesCastMember
{
  @ApiProperty({ type: [SeriesCharacterDto] })
  characters: SeriesCharacter[];
  @ApiProperty({
    type: 'integer',
    minimum: 0,
    nullable: true,
    description: 'Provider total; never a sum of overlapping roles',
  })
  totalEpisodeCount: number | null;
}

export class SeriesCrewDepartmentDto implements SeriesCrewDepartment {
  @ApiProperty({ type: String, nullable: true })
  department: string | null;
  @ApiProperty({
    type: 'integer',
    minimum: 0,
    nullable: true,
    description:
      'Supplied department total, not a sum of jobs or a person-wide total',
  })
  totalEpisodeCount: number | null;
}

export class SeriesCrewMemberDto
  extends CreditPersonDto
  implements SeriesCrewMember
{
  @ApiProperty({ type: [SeriesJobDto] })
  jobs: SeriesJob[];
  @ApiProperty({ type: [SeriesCrewDepartmentDto] })
  departments: SeriesCrewDepartment[];
}

export class SeriesCreditSectionsDto {
  @ApiProperty({ type: SectionAvailabilityDto })
  cast: SeriesCredits['sections']['cast'];
  @ApiProperty({ type: SectionAvailabilityDto })
  crew: SeriesCredits['sections']['crew'];
}

export class SeriesCreditsDto implements SeriesCredits {
  @ApiProperty({ type: [SeriesCastMemberDto] })
  cast: SeriesCastMember[];
  @ApiProperty({ type: [SeriesCrewMemberDto] })
  crew: SeriesCrewMember[];
  @ApiProperty({ type: SeriesCreditSectionsDto })
  sections: SeriesCredits['sections'];
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

export class MediaPhotoDto implements MediaPhoto {
  @ApiPropertyOptional({ type: String })
  filePath?: string;
  @ApiPropertyOptional({ type: Number, minimum: 1 })
  width?: number;
  @ApiPropertyOptional({ type: Number, minimum: 1 })
  height?: number;
  @ApiPropertyOptional({ type: Number, exclusiveMinimum: true, minimum: 0 })
  aspectRatio?: number;
  @ApiPropertyOptional({ type: String, nullable: true })
  language?: string | null;
  @ApiProperty({ type: String })
  thumbnailUrl: string;
  @ApiProperty({ type: String })
  fullUrl: string;
}

export class MediaVideoDto implements MediaVideo {
  @ApiPropertyOptional({ type: String })
  id?: string;
  @ApiPropertyOptional({ type: String })
  key?: string;
  @ApiPropertyOptional({ type: String })
  site?: string;
  @ApiPropertyOptional({ type: String })
  type?: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  language?: string | null;
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  publishedAt?: string;
  @ApiProperty({ type: String })
  name: string;
  @ApiProperty({
    type: String,
    description:
      'Empty for unsupported providers; only supported hosts get links or players',
  })
  url: string;
  @ApiPropertyOptional({ type: String })
  thumbnailUrl?: string;
}

export class SeriesImageSectionsDto {
  @ApiProperty({ type: SectionAvailabilityDto })
  posters: SeriesImages['sections']['posters'];
  @ApiProperty({ type: SectionAvailabilityDto })
  backdrops: SeriesImages['sections']['backdrops'];
}

export class SeriesImagesDto implements SeriesImages {
  @ApiProperty({ type: [MediaPhotoDto] })
  posters: MediaPhoto[];
  @ApiProperty({ type: [MediaPhotoDto] })
  backdrops: MediaPhoto[];
  @ApiProperty({ type: SeriesImageSectionsDto })
  sections: SeriesImages['sections'];
}

export class SeriesVideosDto implements SeriesVideos {
  @ApiProperty({ type: [MediaVideoDto] })
  videos: MediaVideo[];
  @ApiProperty({ type: SectionAvailabilityDto })
  availability: SeriesVideos['availability'];
}

export class SeriesDetailsDto implements SeriesDetails {
  @ApiPropertyOptional({ type: SeriesImagesDto })
  images?: SeriesImages;
  @ApiPropertyOptional({ type: SeriesVideosDto })
  videos?: SeriesVideos;
  @ApiPropertyOptional({ type: SeriesCreditsDto })
  credits?: SeriesCredits;
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

  @ApiPropertyOptional({
    type: String,
    description: 'Display still and original image candidates for the viewer',
  })
  stillSrcSet?: string;

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
