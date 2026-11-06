import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, Matches } from 'class-validator';
import type { ContentLanguage } from '@movie-explorer/contracts';

export class LocalizationQuery {
  @ApiPropertyOptional({ enum: ['en-US', 'hu-HU'], default: 'en-US' })
  @IsOptional()
  @IsIn(['en-US', 'hu-HU'])
  language?: ContentLanguage;

  @ApiPropertyOptional({ pattern: '^[A-Z]{2}$', default: 'US' })
  @IsOptional()
  @Matches(/^[A-Z]{2}$/)
  watchRegion?: string;
}
