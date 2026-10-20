import type { TvSeriesDetails } from '@movie-explorer/contracts';

export const TV_PROVIDER = Symbol('TV_PROVIDER');

export interface TvProvider {
  findOne(id: number): Promise<TvSeriesDetails | undefined>;
}
