import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { WatchProvider, WatchProviders } from '@movie-explorer/contracts';

export class WatchProviderDto implements WatchProvider {
  @ApiProperty({ type: 'integer' })
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  logoUrl?: string;

  @ApiProperty({ enum: ['streaming', 'rent', 'buy'] })
  category: WatchProvider['category'];

  @ApiProperty({ example: 'HU' })
  region: string;

  @ApiPropertyOptional({ format: 'uri' })
  watchUrl?: string;
}

export class WatchProvidersDto implements WatchProviders {
  @ApiProperty({ type: [WatchProviderDto] })
  providers: WatchProviderDto[];
}
