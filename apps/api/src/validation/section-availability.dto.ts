import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { SectionAvailability } from '@movie-explorer/contracts';

export class SectionAvailabilityDto {
  @ApiProperty({
    enum: ['available', 'unavailable'],
    description: 'Available includes a successfully loaded empty section.',
  })
  status: SectionAvailability['status'];

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 86400,
    description: 'Safe delay before manual retry, only when unavailable.',
  })
  retryAfterSeconds?: number;
}

export class MovieSectionsDto {
  @ApiProperty({ type: () => SectionAvailabilityDto })
  credits: SectionAvailabilityDto;

  @ApiProperty({ type: () => SectionAvailabilityDto })
  photos: SectionAvailabilityDto;

  @ApiProperty({ type: () => SectionAvailabilityDto })
  videos: SectionAvailabilityDto;
}
