import { Injectable } from '@nestjs/common';
import type { ImdbRatingResponse } from '@movie-explorer/contracts';
import { TmdbExternalIds } from '../integrations/tmdb/tmdb-external-ids';
import { OmdbAdapter } from '../integrations/omdb/omdb.adapter';

@Injectable()
export class RatingsService {
  constructor(
    private readonly ids: TmdbExternalIds,
    private readonly omdb: OmdbAdapter,
  ) {}

  async findImdb(
    kind: 'movie' | 'series',
    id: number,
  ): Promise<ImdbRatingResponse> {
    if (!this.omdb.enabled) return { imdb: null };
    try {
      const imdbId = await this.ids.resolve(kind, id);
      return { imdb: imdbId ? await this.omdb.findRating(imdbId, kind) : null };
    } catch {
      // Optional upstream data must never break the primary Details resource.
      return { imdb: null };
    }
  }
}
