import { Inject, Injectable } from '@nestjs/common';
import type { TvSeriesDetails } from '@movie-explorer/contracts';

import { TV_PROVIDER, TvProvider } from './tv-provider';

@Injectable()
export class TvService {
  constructor(@Inject(TV_PROVIDER) private readonly provider: TvProvider) {}

  findOne(id: number): Promise<TvSeriesDetails | undefined> {
    return this.provider.findOne(id);
  }
}
